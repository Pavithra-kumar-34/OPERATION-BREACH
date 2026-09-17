import csv
import io
import random
import string
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_admin
from services.scoring import calculate_team_score
from services.audit import log_audit_event
from services.operation_manager import broadcast_team_update
from websocket import manager

router = APIRouter(prefix="/api/admin", tags=["Admin Operations"])

def generate_team_code(db: Session) -> str:
    """Generates a unique team code in format DX-XXXXXX."""
    while True:
        suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        code = f"DX-{suffix}"
        if not db.query(models.Team).filter(models.Team.team_code == code).first():
            return code

# ----------------- COMPETITION CONTROLS -----------------
@router.post("/competition", response_model=dict)
async def control_competition(
    control_data: schemas.CompetitionControlRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    action = control_data.action.upper()
    settings = db.query(models.CompetitionSettings).first()
    if not settings:
        settings = models.CompetitionSettings(status="LOCKED")
        db.add(settings)

    now = datetime.now(timezone.utc)
    teams = db.query(models.Team).all()

    if action == "START":
        settings.status = "ACTIVE"
        for team in teams:
            if team.status != "COMPLETED":
                team.status = "ACTIVE"
                progress = next((p for p in team.scenario_progress if p.scenario_id == team.scenario_id), None)
                if not progress and team.scenario_id:
                    progress = models.ScenarioProgress(team_id=team.id, scenario_id=team.scenario_id)
                    db.add(progress)
                if progress and not progress.started_at:
                    progress.started_at = now
                    progress.end_time = now + timedelta(minutes=team.time_limit_minutes or 60)

        db.commit()
        log_audit_event(db, actor=current_admin["email"], role="ADMIN", action="COMPETITION_STARTED")
        await manager.broadcast_all({"type": "COMPETITION_STATE_CHANGED", "status": "ACTIVE"})
        return {"status": "SUCCESS", "message": "Competition started for all active teams.", "competition_status": "ACTIVE"}

    elif action == "PAUSE":
        settings.status = "PAUSED"
        for team in teams:
            if team.status == "ACTIVE":
                team.status = "PAUSED"
                progress = next((p for p in team.scenario_progress if p.scenario_id == team.scenario_id), None)
                if progress and not progress.paused_at:
                    progress.paused_at = now

        db.commit()
        log_audit_event(db, actor=current_admin["email"], role="ADMIN", action="COMPETITION_PAUSED")
        await manager.broadcast_all({"type": "COMPETITION_STATE_CHANGED", "status": "PAUSED"})
        return {"status": "SUCCESS", "message": "Competition paused.", "competition_status": "PAUSED"}

    elif action == "RESUME":
        settings.status = "ACTIVE"
        for team in teams:
            if team.status == "PAUSED":
                team.status = "ACTIVE"
                progress = next((p for p in team.scenario_progress if p.scenario_id == team.scenario_id), None)
                if progress and progress.paused_at:
                    pause_delta = int((now - progress.paused_at).total_seconds())
                    progress.total_paused_seconds = (progress.total_paused_seconds or 0) + max(0, pause_delta)
                    progress.paused_at = None

        db.commit()
        log_audit_event(db, actor=current_admin["email"], role="ADMIN", action="COMPETITION_RESUMED")
        await manager.broadcast_all({"type": "COMPETITION_STATE_CHANGED", "status": "ACTIVE"})
        return {"status": "SUCCESS", "message": "Competition resumed.", "competition_status": "ACTIVE"}

    elif action == "END":
        settings.status = "COMPLETED"
        for team in teams:
            team.status = "COMPLETED"
            for progress in team.scenario_progress:
                progress.completion_status = "COMPLETED"
                progress.end_time = now

        db.commit()
        log_audit_event(db, actor=current_admin["email"], role="ADMIN", action="COMPETITION_ENDED")
        await manager.broadcast_all({"type": "COMPETITION_STATE_CHANGED", "status": "COMPLETED"})
        return {"status": "SUCCESS", "message": "Competition concluded.", "competition_status": "COMPLETED"}

    elif action == "RESET":
        settings.status = "LOCKED"
        for team in teams:
            team.status = "LOCKED"
            team.score = 0.0
            for progress in team.scenario_progress:
                progress.current_stage = "DETECT"
                progress.stage_status = "IN_PROGRESS"
                progress.started_at = None
                progress.end_time = None
                progress.paused_at = None
                progress.total_paused_seconds = 0
                progress.detection_answer = None
                progress.detection_correct = False
                progress.detection_attempts = 0
                progress.hints_used = 0
                progress.answers_json = "{}"
                progress.findings_json = "[]"
                progress.identification_submission_json = "{}"
                progress.identification_correct = False
                progress.selected_responses_json = "[]"
                progress.report_data_json = "{}"
                progress.report_submitted = False
                progress.completion_status = "IN_PROGRESS"
                progress.score = 0.0
                progress.score_breakdown_json = "{}"

            # Clear team evidence, findings, searches
            db.query(models.TeamEvidence).filter(models.TeamEvidence.team_id == team.id).delete()
            db.query(models.Finding).filter(models.Finding.team_id == team.id).delete()
            db.query(models.IOCSearch).filter(models.IOCSearch.team_id == team.id).delete()
            if team.report:
                team.report.is_final = False
                team.report.incident_summary = ""
                team.report.timeline = ""
                team.report.recommendations = ""

            calculate_team_score(db, team.id)

        db.commit()
        log_audit_event(db, actor=current_admin["email"], role="ADMIN", action="COMPETITION_RESET")
        await manager.broadcast_all({"type": "COMPETITION_STATE_CHANGED", "status": "LOCKED"})
        return {"status": "SUCCESS", "message": "Competition and all teams reset.", "competition_status": "LOCKED"}

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid competition action '{action}'.")

# ----------------- TEAM MANAGEMENT -----------------
@router.get("/teams", response_model=List[schemas.TeamResponse])
def list_teams(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    teams = db.query(models.Team).order_by(models.Team.created_at.desc()).all()
    results = []
    for t in teams:
        results.append(schemas.TeamResponse(
            id=t.id,
            team_name=t.team_name,
            team_code=t.team_code,
            scenario_id=t.scenario_id,
            scenario_name=t.scenario.name if t.scenario else "Unassigned",
            difficulty=t.difficulty,
            time_limit_minutes=t.time_limit_minutes,
            max_hints=t.max_hints,
            status=t.status,
            score=t.score,
            analyst_1_name=t.analyst_1_name,
            analyst_2_name=t.analyst_2_name,
            current_stage=t.operation_state.current_stage if t.operation_state else "DETECT",
            created_at=t.created_at,
            updated_at=t.updated_at
        ))
    return results

@router.post("/teams", response_model=schemas.TeamResponse)
def create_team(
    team_data: schemas.TeamCreateRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    t_name = team_data.team_name.strip()
    a1 = team_data.analyst_1_name.strip()
    a2 = team_data.analyst_2_name.strip()

    if not t_name or not a1 or not a2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Team name and both Analyst names are required.")

    if a1.lower() == a2.lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Analyst 1 and Analyst 2 must be different people.")

    # Check for duplicate team name
    if db.query(models.Team).filter(models.Team.team_name == t_name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"A team named '{t_name}' already exists.")

    # Validate scenario
    scenario_id = team_data.scenario_id
    if scenario_id:
        if not db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario ID not found.")
    else:
        first_scen = db.query(models.Scenario).first()
        scenario_id = first_scen.id if first_scen else None

    team_code = generate_team_code(db)
    comp_settings = db.query(models.CompetitionSettings).first()
    initial_status = comp_settings.status if comp_settings else "LOCKED"

    new_team = models.Team(
        team_name=t_name,
        team_code=team_code,
        scenario_id=scenario_id,
        difficulty=team_data.difficulty,
        time_limit_minutes=team_data.time_limit_minutes,
        max_hints=team_data.max_hints,
        status=initial_status,
        analyst_1_name=a1,
        analyst_2_name=a2,
        score=0.0
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    # Add analysts
    analyst_1 = models.Analyst(name=a1, team_id=new_team.id)
    analyst_2 = models.Analyst(name=a2, team_id=new_team.id)
    db.add_all([analyst_1, analyst_2])

    # Add operation state
    op_state = models.TeamOperationState(
        team_id=new_team.id,
        current_stage="DETECT",
        stage_status="IN_PROGRESS"
    )
    db.add(op_state)

    # Add blank report
    report = models.Report(team_id=new_team.id, analyst_name=a1)
    db.add(report)

    # Add initial score
    score_rec = models.Score(team_id=new_team.id, total_score=0.0)
    db.add(score_rec)

    db.commit()

    log_audit_event(
        db=db,
        actor=current_admin["email"],
        role="ADMIN",
        action="TEAM_CREATED",
        team_code=new_team.team_code,
        payload={"team_name": new_team.team_name, "analyst_1": a1, "analyst_2": a2}
    )

    return schemas.TeamResponse(
        id=new_team.id,
        team_name=new_team.team_name,
        team_code=new_team.team_code,
        scenario_id=new_team.scenario_id,
        scenario_name=new_team.scenario.name if new_team.scenario else None,
        difficulty=new_team.difficulty,
        time_limit_minutes=new_team.time_limit_minutes,
        max_hints=new_team.max_hints,
        status=new_team.status,
        score=new_team.score,
        analyst_1_name=new_team.analyst_1_name,
        analyst_2_name=new_team.analyst_2_name,
        current_stage="DETECT",
        created_at=new_team.created_at,
        updated_at=new_team.updated_at
    )

@router.get("/teams/{team_id}/view", response_model=schemas.TeamDetailResponse)
def view_team_detail(
    team_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    total_score, score_rec = calculate_team_score(db, team.id)
    evidences = db.query(models.Evidence).filter(models.Evidence.scenario_id == team.scenario_id).all() if team.scenario_id else []
    viewed_count = db.query(models.TeamEvidence).filter(models.TeamEvidence.team_id == team.id, models.TeamEvidence.viewed == True).count()
    findings = db.query(models.Finding).filter(models.Finding.team_id == team.id).order_by(models.Finding.created_at.desc()).all()
    searches = db.query(models.IOCSearch).filter(models.IOCSearch.team_id == team.id).order_by(models.IOCSearch.created_at.desc()).all()
    activity = db.query(models.AuditLog).filter(models.AuditLog.team_code == team.team_code).order_by(models.AuditLog.timestamp.desc()).limit(20).all()

    op_state = team.operation_state

    return schemas.TeamDetailResponse(
        team=schemas.TeamResponse(
            id=team.id,
            team_name=team.team_name,
            team_code=team.team_code,
            scenario_id=team.scenario_id,
            scenario_name=team.scenario.name if team.scenario else None,
            difficulty=team.difficulty,
            time_limit_minutes=team.time_limit_minutes,
            max_hints=team.max_hints,
            status=team.status,
            score=team.score,
            analyst_1_name=team.analyst_1_name,
            analyst_2_name=team.analyst_2_name,
            current_stage=op_state.current_stage if op_state else "DETECT",
            created_at=team.created_at,
            updated_at=team.updated_at
        ),
        operation_state={
            "current_stage": op_state.current_stage if op_state else "DETECT",
            "stage_status": op_state.stage_status if op_state else "IN_PROGRESS",
            "detection_attempts": op_state.detection_attempts if op_state else 0,
            "detection_correct": op_state.detection_correct if op_state else False,
            "hints_used": op_state.hints_used if op_state else 0,
            "is_completed": op_state.is_completed if op_state else False,
            "started_at": op_state.started_at if op_state else None,
            "end_time": op_state.end_time if op_state else None
        } if op_state else None,
        score_breakdown={
            "total_score": score_rec.total_score if score_rec else 0,
            "detection_score": score_rec.detection_score if score_rec else 0,
            "investigation_score": score_rec.investigation_score if score_rec else 0,
            "analysis_score": score_rec.analysis_score if score_rec else 0,
            "identification_score": score_rec.identification_score if score_rec else 0,
            "response_score": score_rec.response_score if score_rec else 0,
            "evidence_score": score_rec.evidence_score if score_rec else 0,
            "report_score": score_rec.report_score if score_rec else 0,
            "efficiency_score": score_rec.efficiency_score if score_rec else 0,
            "accuracy_percentage": score_rec.accuracy_percentage if score_rec else 0
        } if score_rec else None,
        viewed_evidence_count=viewed_count,
        total_evidence_count=len(evidences),
        hints_used=op_state.hints_used if op_state else 0,
        max_hints=team.max_hints,
        findings=[{"id": f.id, "analyst": f.analyst_name, "desc": f.description, "time": f.created_at} for f in findings],
        ioc_searches=[{"query": s.query, "match": s.is_match, "analyst": s.analyst_name, "time": s.created_at} for s in searches],
        recent_activity=[{"id": a.id, "actor": a.actor, "action": a.action, "time": a.timestamp, "payload": a.payload} for a in activity]
    )

@router.post("/teams/{team_id}/reassign", response_model=dict)
async def reassign_team_scenario(
    team_id: int,
    reassign_data: schemas.TeamReassignRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    scenario = db.query(models.Scenario).filter(models.Scenario.id == reassign_data.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target Scenario not found.")

    team.scenario_id = scenario.id
    # Reset team evidence links
    db.query(models.TeamEvidence).filter(models.TeamEvidence.team_id == team.id).delete()

    db.commit()

    log_audit_event(
        db=db,
        actor=current_admin["email"],
        role="ADMIN",
        action="TEAM_REASSIGNED",
        team_code=team.team_code,
        payload={"scenario_name": scenario.name}
    )

    await broadcast_team_update(db, team.id, event_type="SCENARIO_REASSIGNED")
    return {"status": "SUCCESS", "message": f"Team '{team.team_name}' reassigned to scenario '{scenario.name}'."}

@router.put("/teams/{team_id}", response_model=dict)
def update_team(
    team_id: int,
    update_data: schemas.TeamUpdateRequest,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    for k, v in update_data.dict(exclude_unset=True).items():
        if v is not None:
            setattr(team, k, v)

    db.commit()

    log_audit_event(
        db=db,
        actor=current_admin["email"],
        role="ADMIN",
        action="TEAM_UPDATED",
        team_code=team.team_code,
        payload=update_data.dict(exclude_unset=True)
    )

    return {"status": "SUCCESS", "message": "Team configuration updated."}

@router.delete("/teams/{team_id}", response_model=dict)
def delete_team(
    team_id: int,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    team_name = team.team_name
    team_code = team.team_code

    # Delete team (cascading deletes analysts, op_state, evidence, findings, searches, actions, report, score)
    db.delete(team)
    db.commit()

    log_audit_event(
        db=db,
        actor=current_admin["email"],
        role="ADMIN",
        action="TEAM_DELETED",
        team_code=team_code,
        payload={"team_name": team_name, "team_code": team_code}
    )

    return {"status": "SUCCESS", "message": f"Team '{team_name}' ({team_code}) deleted successfully."}

@router.delete("/teams", response_model=dict)
def delete_all_teams(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    teams = db.query(models.Team).all()
    count = len(teams)
    for team in teams:
        db.delete(team)
    db.commit()

    log_audit_event(
        db=db,
        actor=current_admin["email"],
        role="ADMIN",
        action="ALL_TEAMS_DELETED",
        payload={"deleted_count": count}
    )

    return {"status": "SUCCESS", "message": f"All {count} teams and associated data deleted successfully."}

@router.post("/clear-all-data", response_model=dict)
def clear_all_operational_data(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Wipes all teams, operation states, findings, evidence links, searches, reports, scores, quiz attempts, and audit logs."""
    # Delete all teams
    teams = db.query(models.Team).all()
    teams_count = len(teams)
    for team in teams:
        db.delete(team)

    # Delete all audit logs
    audit_count = db.query(models.AuditLog).delete()

    # Delete all academy progress / quiz attempts
    db.query(models.QuizAttempt).delete()
    db.query(models.AcademyProgress).delete()

    # Reset competition settings
    settings = db.query(models.CompetitionSettings).first()
    if settings:
        settings.status = "LOCKED"

    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Clean wipe complete. Removed {teams_count} teams, {audit_count} audit logs, and reset system."
    }

# ----------------- ANALYTICS -----------------
@router.get("/analytics", response_model=schemas.AnalyticsOverview)
def get_analytics(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    teams = db.query(models.Team).all()
    total_teams = len(teams)
    active_teams = sum(1 for t in teams if t.status == "ACTIVE")
    completed_teams = sum(1 for t in teams if t.status == "COMPLETED")
    total_participants = total_teams * 2

    scores = [t.score for t in teams if t.score > 0]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    score_recs = db.query(models.Score).all()
    accuracies = [s.accuracy_percentage for s in score_recs if s.accuracy_percentage > 0]
    avg_accuracy = round(sum(accuracies) / len(accuracies), 1) if accuracies else 0.0

    stage_dist = {"DETECT": 0, "INVESTIGATE": 0, "ANALYZE": 0, "IDENTIFY": 0, "RESPOND": 0, "REPORT": 0}
    for t in teams:
        if t.operation_state:
            st = t.operation_state.current_stage
            stage_dist[st] = stage_dist.get(st, 0) + 1

    score_dist = {"0-250": 0, "251-500": 0, "501-750": 0, "751-1000": 0}
    for s in score_recs:
        if s.total_score <= 250:
            score_dist["0-250"] += 1
        elif s.total_score <= 500:
            score_dist["251-500"] += 1
        elif s.total_score <= 750:
            score_dist["501-750"] += 1
        else:
            score_dist["751-1000"] += 1

    # Academy progress
    all_acad_progress = db.query(models.AcademyProgress).all()
    completed_acad_modules = sum(1 for p in all_acad_progress if p.completed)
    total_acad_modules = db.query(models.AcademyModule).count()
    total_analysts = db.query(models.Analyst).count()
    possible_acad_completions = total_acad_modules * total_analysts if total_analysts > 0 else 1
    acad_avg_completion = round((completed_acad_modules / possible_acad_completions) * 100.0, 1)

    op_completion_rate = round((completed_teams / total_teams * 100.0), 1) if total_teams > 0 else 0.0

    return schemas.AnalyticsOverview(
        total_teams=total_teams,
        active_teams=active_teams,
        completed_teams=completed_teams,
        total_participants=total_participants,
        average_score=avg_score,
        average_accuracy=avg_accuracy,
        average_completion=op_completion_rate,
        average_efficiency=85.0,
        academy_average_completion=acad_avg_completion,
        operation_completion_rate=op_completion_rate,
        stage_distribution=stage_dist,
        score_distribution=score_dist
    )

# ----------------- AUDIT LOGS -----------------
@router.get("/audit", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    team_code: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.AuditLog)
    if action:
        query = query.filter(models.AuditLog.action == action)
    if team_code:
        query = query.filter(models.AuditLog.team_code == team_code)

    logs = query.order_by(models.AuditLog.timestamp.desc()).limit(limit).all()

    return [
        schemas.AuditLogResponse(
            id=log.id,
            timestamp=log.timestamp,
            actor=log.actor,
            role=log.role,
            action=log.action,
            team_code=log.team_code,
            payload=log.payload,
            ip_address=log.ip_address
        )
        for log in logs
    ]

@router.delete("/audit", response_model=dict)
def clear_audit_logs(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    count = db.query(models.AuditLog).delete()
    db.commit()
    return {"status": "SUCCESS", "message": f"Cleared {count} audit log records."}


# ----------------- CSV EXPORT -----------------
@router.get("/export")
def export_competition_results(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    teams = db.query(models.Team).order_by(models.Team.score.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Rank", "Team", "Team Code", "Analyst 1", "Analyst 2",
        "Scenario", "Difficulty", "Score", "Accuracy (%)",
        "Efficiency Score", "Current Stage", "Status",
        "Started At", "Completed At"
    ])

    for idx, team in enumerate(teams, start=1):
        score_rec = team.score_breakdown
        op_state = team.operation_state
        writer.writerow([
            idx,
            team.team_name,
            team.team_code,
            team.analyst_1_name,
            team.analyst_2_name,
            team.scenario.name if team.scenario else "N/A",
            team.difficulty,
            team.score,
            score_rec.accuracy_percentage if score_rec else 0.0,
            score_rec.efficiency_score if score_rec else 0.0,
            op_state.current_stage if op_state else "DETECT",
            team.status,
            op_state.started_at.isoformat() if op_state and op_state.started_at else "N/A",
            op_state.end_time.isoformat() if op_state and op_state.end_time else "N/A"
        ])

    csv_data = output.getvalue()
    log_audit_event(db, actor=current_admin["email"], role="ADMIN", action="EXPORT_RESULTS")

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=defendx-results.csv"}
    )
