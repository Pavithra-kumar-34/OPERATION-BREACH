import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/api/academy", tags=["Academy"])

@router.get("/modules", response_model=List[schemas.AcademyModuleSummary])
def get_academy_modules(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyst_name = current_user.get("analyst_name") or current_user.get("email") or "Analyst"
    modules = db.query(models.AcademyModule).order_by(models.AcademyModule.module_number.asc()).all()

    # Fetch progress records for this analyst
    progress_map = {}
    if analyst_name:
        progress_records = db.query(models.AcademyProgress).filter(
            models.AcademyProgress.analyst_name == analyst_name
        ).all()
        progress_map = {p.module_id: p for p in progress_records}

    result = []
    for m in modules:
        prog = progress_map.get(m.id)
        result.append(schemas.AcademyModuleSummary(
            id=m.id,
            module_number=m.module_number,
            title=m.title,
            category=m.category,
            description=m.description,
            difficulty=m.difficulty,
            completed=prog.completed if prog else False,
            quiz_score=prog.quiz_score if prog else 0.0,
            attempts=prog.attempts if prog else 0
        ))
    return result

@router.get("/modules/{module_id}", response_model=schemas.AcademyModuleDetail)
def get_module_detail(
    module_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyst_name = current_user.get("analyst_name") or current_user.get("email") or "Analyst"
    module = db.query(models.AcademyModule).filter(models.AcademyModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Academy module not found.")

    progress = db.query(models.AcademyProgress).filter(
        models.AcademyProgress.analyst_name == analyst_name,
        models.AcademyProgress.module_id == module.id
    ).first()

    # Hide correct answers from quiz questions sent to participant
    sanitized_questions = []
    for q in module.quiz_questions:
        sanitized_questions.append({
            "question": q.get("question"),
            "options": q.get("options", [])
        })

    return schemas.AcademyModuleDetail(
        id=module.id,
        module_number=module.module_number,
        title=module.title,
        category=module.category,
        description=module.description,
        learning_objective=module.learning_objective,
        explanation=module.explanation,
        why_it_matters=module.why_it_matters,
        example=module.example,
        guided_task=module.guided_task,
        practice_activity=module.practice_activity,
        difficulty=module.difficulty,
        hints=module.hints,
        quiz_questions=sanitized_questions,
        completed=progress.completed if progress else False,
        task_completed=progress.task_completed if progress else False,
        quiz_score=progress.quiz_score if progress else 0.0,
        attempts=progress.attempts if progress else 0
    )

@router.post("/task", response_model=dict)
def submit_guided_task(
    task_data: schemas.TaskSubmitRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyst_name = current_user.get("analyst_name") or current_user.get("email") or "Analyst"
    module = db.query(models.AcademyModule).filter(models.AcademyModule.id == task_data.module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")

    if not task_data.task_solution or len(task_data.task_solution.strip()) < 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a detailed task solution.")

    progress = db.query(models.AcademyProgress).filter(
        models.AcademyProgress.analyst_name == analyst_name,
        models.AcademyProgress.module_id == module.id
    ).first()

    if not progress:
        progress = models.AcademyProgress(
            analyst_name=analyst_name,
            module_id=module.id,
            task_completed=True,
            completed=False
        )
        db.add(progress)
    else:
        progress.task_completed = True

    db.commit()
    return {"status": "SUCCESS", "message": "Guided task submitted and verified successfully."}

@router.post("/quiz", response_model=schemas.QuizResultResponse)
def submit_quiz(
    quiz_data: schemas.QuizSubmitRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyst_name = current_user.get("analyst_name") or current_user.get("email") or "Analyst"
    module = db.query(models.AcademyModule).filter(models.AcademyModule.id == quiz_data.module_id).first()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found.")

    questions = module.quiz_questions
    if not questions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No quiz questions found for this module.")

    if len(quiz_data.answers) != len(questions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Expected answers for {len(questions)} questions, received {len(quiz_data.answers)}."
        )

    correct_count = 0
    feedback = []

    for idx, (q, user_ans) in enumerate(zip(questions, quiz_data.answers)):
        correct_idx = q.get("correct_index", 0)
        is_correct = (user_ans == correct_idx)
        if is_correct:
            correct_count += 1
        feedback.append({
            "question_index": idx,
            "question": q.get("question"),
            "user_answer": user_ans,
            "correct_answer": correct_idx,
            "is_correct": is_correct,
            "explanation": q.get("explanation", "")
        })

    score_pct = round((correct_count / len(questions)) * 100.0, 1)
    passed = score_pct >= 70.0

    # Save Quiz Attempt
    attempt = models.QuizAttempt(
        analyst_name=analyst_name,
        module_id=module.id,
        score=score_pct,
        passed=passed,
        answers_json=json.dumps(quiz_data.answers)
    )
    db.add(attempt)

    # Update or create progress
    progress = db.query(models.AcademyProgress).filter(
        models.AcademyProgress.analyst_name == analyst_name,
        models.AcademyProgress.module_id == module.id
    ).first()

    if not progress:
        progress = models.AcademyProgress(
            analyst_name=analyst_name,
            module_id=module.id,
            completed=passed,
            quiz_score=score_pct,
            attempts=1
        )
        db.add(progress)
    else:
        progress.attempts += 1
        if score_pct > progress.quiz_score:
            progress.quiz_score = score_pct
        if passed:
            progress.completed = True

    db.commit()

    return schemas.QuizResultResponse(
        module_id=module.id,
        score=score_pct,
        passed=passed,
        correct_count=correct_count,
        total_questions=len(questions),
        feedback=feedback,
        module_completed=progress.completed
    )

@router.get("/recommendations", response_model=schemas.RecommendationResponse)
def get_recommendations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyst_name = current_user.get("analyst_name") or current_user.get("email") or "Analyst"
    all_modules = db.query(models.AcademyModule).order_by(models.AcademyModule.module_number.asc()).all()
    total_count = len(all_modules)

    progress_records = db.query(models.AcademyProgress).filter(
        models.AcademyProgress.analyst_name == analyst_name
    ).all()
    progress_map = {p.module_id: p for p in progress_records}

    completed_count = sum(1 for m in all_modules if progress_map.get(m.id) and progress_map[m.id].completed)
    overall_progress = round((completed_count / total_count * 100.0), 1) if total_count > 0 else 0.0

    # Determine next step
    current_next_step = None
    recommendations = []

    for m in all_modules:
        prog = progress_map.get(m.id)
        if not prog or not prog.completed:
            if not current_next_step:
                current_next_step = schemas.AcademyModuleSummary(
                    id=m.id,
                    module_number=m.module_number,
                    title=m.title,
                    category=m.category,
                    description=m.description,
                    difficulty=m.difficulty,
                    completed=False,
                    quiz_score=prog.quiz_score if prog else 0.0,
                    attempts=prog.attempts if prog else 0
                )
            recommendations.append({
                "module_id": m.id,
                "module_number": m.module_number,
                "title": m.title,
                "category": m.category,
                "reason": "Incomplete prerequisite for full Blue Team Certification",
                "priority": "High" if m.module_number <= 5 else "Medium"
            })

    is_certified = (completed_count == total_count and total_count > 0)

    return schemas.RecommendationResponse(
        overall_progress=overall_progress,
        completed_modules=completed_count,
        total_modules=total_count,
        current_next_step=current_next_step,
        recommendations=recommendations[:4],
        is_certified=is_certified
    )

@router.get("/certificate", response_model=dict)
def get_certificate_data(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analyst_name = current_user.get("analyst_name") or current_user.get("email") or "Analyst"
    all_modules = db.query(models.AcademyModule).all()
    total_count = len(all_modules)

    progress_records = db.query(models.AcademyProgress).filter(
        models.AcademyProgress.analyst_name == analyst_name,
        models.AcademyProgress.completed == True
    ).all()

    completed_count = len(progress_records)
    is_certified = (completed_count >= total_count and total_count > 0)

    return {
        "analyst_name": analyst_name,
        "is_certified": is_certified,
        "completed_modules": completed_count,
        "total_modules": total_count,
        "issue_date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        "certificate_id": f"DX-CERT-{abs(hash(analyst_name)) % 1000000:06d}",
        "title": "DEFENDX BLUE TEAM ACADEMY CERTIFIED SPECIALIST"
    }
