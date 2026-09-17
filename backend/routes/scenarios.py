from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])

@router.get("", response_model=List[schemas.ScenarioSummaryResponse])
def list_scenarios(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scenarios = db.query(models.Scenario).all()
    return [
        schemas.ScenarioSummaryResponse(
            id=s.id,
            key=s.key,
            name=s.name,
            description=s.description,
            difficulty=s.difficulty
        )
        for s in scenarios
    ]

@router.get("/{scenario_id}", response_model=schemas.ScenarioDetailResponse)
def get_scenario_detail(
    scenario_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    scenario = db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found.")

    evidence_count = db.query(models.Evidence).filter(models.Evidence.scenario_id == scenario.id).count()

    # Sanitize detection options for participant (do not leak is_correct in response)
    sanitized_detect_opts = []
    for opt in scenario.detection_options:
        sanitized_detect_opts.append({
            "id": opt.get("id"),
            "title": opt.get("title"),
            "severity": opt.get("severity"),
            "source": opt.get("source"),
            "description": opt.get("description")
        })

    # Sanitize response actions for participant (do not leak classification until submitted)
    sanitized_responses = []
    for r in scenario.response_actions:
        sanitized_responses.append({
            "id": r.get("id"),
            "title": r.get("title"),
            "description": r.get("description")
        })

    return schemas.ScenarioDetailResponse(
        id=scenario.id,
        key=scenario.key,
        name=scenario.name,
        description=scenario.description,
        difficulty=scenario.difficulty,
        detection_signal=scenario.detection_signal,
        detection_options=sanitized_detect_opts,
        identification_options=scenario.identification_options,
        response_actions=sanitized_responses,
        timeline=scenario.timeline,
        evidence_count=evidence_count,
        stage_prompts=scenario.stage_prompts,
        tactical_hints=scenario.tactical_hints,
        report_fields=scenario.report_fields
    )
