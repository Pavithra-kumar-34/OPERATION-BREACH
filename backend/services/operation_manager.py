from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import models
from services.scoring import calculate_team_score
from services.audit import log_audit_event
from websocket import manager

def get_operation_time_metrics(team: models.Team) -> Dict[str, Any]:
    """Calculates authoritative real-time timer metrics on the server."""
    op_state = next((p for p in team.scenario_progress if p.scenario_id == team.scenario_id), None)
    total_seconds = (team.time_limit_minutes or 60) * 60

    if not op_state or not op_state.started_at:
        return {
            "time_remaining_seconds": total_seconds,
            "total_time_seconds": total_seconds,
            "started_at": None,
            "end_time": None,
            "paused_at": None
        }

    now = datetime.now(timezone.utc)
    started_at = op_state.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)

    paused_seconds = op_state.total_paused_seconds or 0

    if team.status == "PAUSED" and op_state.paused_at:
        paused_at = op_state.paused_at
        if paused_at.tzinfo is None:
            paused_at = paused_at.replace(tzinfo=timezone.utc)
        current_pause_delta = int((now - paused_at).total_seconds())
        effective_elapsed = int((paused_at - started_at).total_seconds()) - paused_seconds
    elif team.status == "COMPLETED" and op_state.end_time:
        end_time = op_state.end_time
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)
        effective_elapsed = int((end_time - started_at).total_seconds()) - paused_seconds
    else:
        effective_elapsed = int((now - started_at).total_seconds()) - paused_seconds

    remaining = max(0, total_seconds - effective_elapsed)

    return {
        "time_remaining_seconds": remaining,
        "total_time_seconds": total_seconds,
        "started_at": op_state.started_at,
        "end_time": op_state.end_time,
        "paused_at": op_state.paused_at
    }

async def broadcast_team_update(db: Session, team_id: int, event_type: str = "STATE_UPDATE", extra: Optional[Dict[str, Any]] = None):
    """Calculates updated team score and broadcasts synchronized state to all team members."""
    total_score, score_breakdown = calculate_team_score(db, team_id)
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team or not team.scenario_id:
        return
    op_state = next((p for p in team.scenario_progress if p.scenario_id == team.scenario_id), None)
    if not op_state:
        return

    time_metrics = get_operation_time_metrics(team)

    message = {
        "type": event_type,
        "team_id": team.id,
        "team_name": team.team_name,
        "status": team.status,
        "current_stage": op_state.current_stage,
        "stage_status": op_state.stage_status,
        "total_score": team.score,
        "score_breakdown": {
            "detection": score_breakdown.detection_score if score_breakdown else 0,
            "investigation": score_breakdown.investigation_score if score_breakdown else 0,
            "analysis": score_breakdown.analysis_score if score_breakdown else 0,
            "identification": score_breakdown.identification_score if score_breakdown else 0,
            "response": score_breakdown.response_score if score_breakdown else 0,
            "evidence": score_breakdown.evidence_score if score_breakdown else 0,
            "report": score_breakdown.report_score if score_breakdown else 0,
            "efficiency": score_breakdown.efficiency_score if score_breakdown else 0,
            "accuracy": score_breakdown.accuracy_percentage if score_breakdown else 0,
        },
        "time_remaining_seconds": time_metrics["time_remaining_seconds"],
        "hints_used": op_state.hints_used,
        "max_hints": team.max_hints,
        "extra": extra or {}
    }

    await manager.broadcast_to_team(team_id, message)
    await manager.broadcast_to_admins({"type": "ADMIN_TEAM_SYNC", "team_id": team_id, "data": message})

def verify_operation_active(team: models.Team):
    """Enforces server-side operation status constraints."""
    if team.status == "LOCKED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation is currently LOCKED. The administrator has not activated your operation yet."
        )
    if team.status == "PAUSED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation is currently PAUSED. Timers and submissions are temporarily frozen."
        )
    if team.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation has been COMPLETED. No further submissions are allowed."
        )
