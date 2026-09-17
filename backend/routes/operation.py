import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_analyst, get_current_user
from services.operation_manager import (
    get_operation_time_metrics,
    broadcast_team_update,
    verify_operation_active
)
from services.scoring import calculate_team_score
from services.audit import log_audit_event

router = APIRouter(prefix="/api/operation", tags=["Operation"])

def get_scenario_progress(db: Session, team: models.Team, create: bool = True):
    if not team or not team.scenario_id:
        return None
    progress = db.query(models.ScenarioProgress).filter(
        models.ScenarioProgress.team_id == team.id,
        models.ScenarioProgress.scenario_id == team.scenario_id
    ).first()
    if not progress and create:
        progress = models.ScenarioProgress(team_id=team.id, scenario_id=team.scenario_id)
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress

@router.get("/status", response_model=schemas.OperationStatusResponse)
def get_operation_status(
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    op_state = get_scenario_progress(db, team)
    if not op_state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No scenario assigned to team.")

    time_metrics = get_operation_time_metrics(team)
    total_score, score_breakdown = calculate_team_score(db, team_id)

    stages_order = ["DETECT", "INVESTIGATE", "ANALYZE", "IDENTIFY", "RESPOND", "REPORT"]
    curr_idx = stages_order.index(op_state.current_stage) if op_state.current_stage in stages_order else 0
    completed_stages = stages_order[:curr_idx]
    if op_state.completion_status == "COMPLETED":
        completed_stages = stages_order

    return schemas.OperationStatusResponse(
        team_id=team.id,
        team_name=team.team_name,
        team_code=team.team_code,
        scenario_id=team.scenario_id,
        scenario_name=team.scenario.name if team.scenario else None,
        status=team.status,
        current_stage=op_state.current_stage,
        stage_status=op_state.stage_status,
        started_at=op_state.started_at,
        end_time=op_state.end_time,
        paused_at=op_state.paused_at,
        time_remaining_seconds=time_metrics["time_remaining_seconds"],
        total_time_seconds=time_metrics["total_time_seconds"],
        hints_used=op_state.hints_used,
        max_hints=team.max_hints,
        total_score=op_state.score,
        score_breakdown={
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
        completed_stages=completed_stages,
        analyst_1=team.analyst_1_name,
        analyst_2=team.analyst_2_name,
        scenario_completed=op_state.completion_status == "COMPLETED"
    )

# ----------------- STAGE 1: DETECT -----------------
@router.post("/detect", response_model=dict)
async def submit_detection(
    detect_data: schemas.DetectSubmitRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    op_state = get_scenario_progress(db, team)
    if op_state.current_stage != "DETECT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot submit detection in stage '{op_state.current_stage}'."
        )

    scenario = team.scenario
    if not scenario:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No scenario assigned to team.")

    # Find chosen option
    chosen_opt = next((opt for opt in scenario.detection_options if opt.get("id") == detect_data.selected_option_id), None)
    if not chosen_opt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid detection alert ID selected.")

    op_state.detection_attempts += 1
    op_state.detection_answer = detect_data.selected_option_id
    is_correct = chosen_opt.get("is_correct", False)

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="DETECT",
        team_code=team.team_code,
        payload={"selected_id": detect_data.selected_option_id, "is_correct": is_correct, "attempts": op_state.detection_attempts}
    )

    if is_correct:
        op_state.detection_correct = True
        op_state.current_stage = "INVESTIGATE"
        op_state.stage_status = "IN_PROGRESS"
        db.commit()
        await broadcast_team_update(db, team.id, event_type="STAGE_ADVANCED", extra={"new_stage": "INVESTIGATE"})
        return {
            "status": "CORRECT",
            "message": "Detection verified! Suspicious root alert confirmed. Proceeding to Investigation stage.",
            "next_stage": "INVESTIGATE"
        }
    else:
        db.commit()
        await broadcast_team_update(db, team.id, event_type="DETECTION_FAILED")
        return {
            "status": "INCORRECT",
            "message": "Incorrect detection alert selected. Efficiency score reduced. Review alert signals carefully.",
            "next_stage": "DETECT"
        }

# ----------------- STAGE 2 & 3: EVIDENCE & FINDINGS -----------------
@router.get("/evidence", response_model=List[schemas.EvidenceResponse])
def get_team_evidences(
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team or not team.scenario:
        return []

    evidences = db.query(models.Evidence).filter(models.Evidence.scenario_id == team.scenario_id).all()
    team_ev_map = {te.evidence_id: te for te in team.team_evidence}
    progress = get_scenario_progress(db, team)
    viewed_ids = set(progress.answers.get("viewed_evidence_ids", [])) if progress else set()
    evidence_flags = progress.answers.get("evidence_flags", {}) if progress else {}
    viewed_codes = {ev.evidence_code for ev in evidences if ev.id in viewed_ids}

    results = []
    for ev in evidences:
        te = team_ev_map.get(ev.id)
        # Check prerequisite lock
        is_locked = False
        if ev.prerequisite_evidence_code and ev.prerequisite_evidence_code not in viewed_codes:
            is_locked = True

        results.append(schemas.EvidenceResponse(
            id=ev.id,
            evidence_code=ev.evidence_code,
            title=ev.title,
            evidence_type=ev.evidence_type,
            content=ev.content if not is_locked else "[LOCKED] Requires inspecting prerequisite evidence first.",
            is_suspicious=ev.is_suspicious,
            is_authoritative=ev.is_authoritative,
            prerequisite_evidence_code=ev.prerequisite_evidence_code,
            is_locked=is_locked,
            viewed=ev.id in viewed_ids,
            is_flagged_suspicious=evidence_flags.get(str(ev.id)) == "suspicious",
            is_flagged_benign=evidence_flags.get(str(ev.id)) == "benign",
            viewed_by=te.viewed_by if te else None
        ))
    return results

@router.post("/evidence/{evidence_id}/view", response_model=dict)
async def view_evidence(
    evidence_id: int,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    ev = db.query(models.Evidence).filter(models.Evidence.id == evidence_id, models.Evidence.scenario_id == team.scenario_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found.")

    te = db.query(models.TeamEvidence).filter(
        models.TeamEvidence.team_id == team_id,
        models.TeamEvidence.evidence_id == evidence_id
    ).first()

    if not te:
        te = models.TeamEvidence(
            team_id=team_id,
            evidence_id=evidence_id,
            viewed=True,
            viewed_by=analyst_name
        )
        db.add(te)
    else:
        te.viewed = True
        if not te.viewed_by:
            te.viewed_by = analyst_name

    progress = get_scenario_progress(db, team)
    answers = progress.answers
    answers.setdefault("viewed_evidence_ids", [])
    if evidence_id not in answers["viewed_evidence_ids"]:
        answers["viewed_evidence_ids"].append(evidence_id)
    progress.answers_json = json.dumps(answers)
    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="VIEW_EVIDENCE",
        team_code=team.team_code,
        payload={"evidence_code": ev.evidence_code, "title": ev.title}
    )

    await broadcast_team_update(db, team_id, event_type="EVIDENCE_VIEWED", extra={"evidence_id": ev.id, "evidence_code": ev.evidence_code})
    return {"status": "SUCCESS", "message": f"Evidence {ev.evidence_code} marked as viewed."}

@router.post("/evidence/flag", response_model=dict)
async def flag_evidence(
    flag_data: schemas.EvidenceFlagRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    ev = db.query(models.Evidence).filter(models.Evidence.id == flag_data.evidence_id, models.Evidence.scenario_id == team.scenario_id).first()
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence item not found.")

    te = db.query(models.TeamEvidence).filter(
        models.TeamEvidence.team_id == team_id,
        models.TeamEvidence.evidence_id == flag_data.evidence_id
    ).first()

    if not te:
        te = models.TeamEvidence(team_id=team_id, evidence_id=flag_data.evidence_id, viewed=True, viewed_by=analyst_name)
        db.add(te)

    if flag_data.flag_type == "suspicious":
        te.is_flagged_suspicious = True
        te.is_flagged_benign = False
    elif flag_data.flag_type == "benign":
        te.is_flagged_benign = True
        te.is_flagged_suspicious = False
    else:  # clear
        te.is_flagged_suspicious = False
        te.is_flagged_benign = False

    progress = get_scenario_progress(db, team)
    answers = progress.answers
    answers.setdefault("evidence_flags", {})
    answers["evidence_flags"][str(flag_data.evidence_id)] = flag_data.flag_type
    progress.answers_json = json.dumps(answers)
    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="MARK_EVIDENCE",
        team_code=team.team_code,
        payload={"evidence_id": ev.id, "code": ev.evidence_code, "flag": flag_data.flag_type}
    )

    await broadcast_team_update(db, team_id, event_type="EVIDENCE_FLAGGED", extra={"evidence_id": ev.id, "flag": flag_data.flag_type})
    return {"status": "SUCCESS", "message": f"Evidence {ev.evidence_code} flagged as {flag_data.flag_type}."}

# ----------------- IOC LOOKUP -----------------
@router.post("/ioc/search", response_model=schemas.IOCSearchResponse)
async def search_ioc(
    ioc_data: schemas.IOCSearchRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    query = ioc_data.query.strip()
    if not query:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Search query cannot be empty.")

    scenario = team.scenario
    indicators = scenario.indicators if scenario else []

    # Search for match
    match = next((ind for ind in indicators if ind.get("value", "").lower() == query.lower()), None)
    is_match = match is not None

    # Record search in database
    search_rec = models.IOCSearch(
        team_id=team_id,
        analyst_name=analyst_name,
        query=query,
        is_match=is_match,
        match_details_json=json.dumps(match or {})
    )
    db.add(search_rec)
    progress = get_scenario_progress(db, team)
    answers = progress.answers
    answers["ioc_search_count"] = answers.get("ioc_search_count", 0) + 1
    progress.answers_json = json.dumps(answers)
    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="IOC_SEARCH",
        team_code=team.team_code,
        payload={"query": query, "is_match": is_match}
    )

    await broadcast_team_update(db, team_id, event_type="IOC_SEARCHED", extra={"query": query, "is_match": is_match})

    return schemas.IOCSearchResponse(
        query=query,
        is_match=is_match,
        status="MATCH FOUND" if is_match else "NO AUTHORITATIVE MATCH",
        details=match
    )

# ----------------- FINDINGS -----------------
@router.get("/findings", response_model=List[schemas.FindingResponse])
def get_findings(
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    progress = get_scenario_progress(db, team)
    return progress.findings if progress else []

@router.post("/findings", response_model=schemas.FindingResponse)
async def create_finding(
    finding_data: schemas.FindingCreateRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    if not finding_data.description or len(finding_data.description.strip()) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Finding description must be meaningful (>= 5 chars).")

    progress = get_scenario_progress(db, team)
    finding = {
        "id": len(progress.findings) + 1,
        "analyst_name": analyst_name,
        "description": finding_data.description.strip(),
        "evidence_ids": finding_data.evidence_ids,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    findings = progress.findings
    findings.insert(0, finding)
    progress.findings_json = json.dumps(findings)
    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="CREATE_FINDING",
        team_code=team.team_code,
        payload={"finding_id": finding["id"], "desc": finding["description"][:50]}
    )

    await broadcast_team_update(db, team_id, event_type="FINDING_ADDED", extra={"finding_id": finding["id"]})

    return finding

# ----------------- HINTS -----------------
@router.post("/hints", response_model=dict)
async def request_hint(
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    op_state = get_scenario_progress(db, team)
    if op_state.hints_used >= team.max_hints:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum hint limit ({team.max_hints}) reached for this operation."
        )

    op_state.hints_used += 1
    hint_index = op_state.hints_used

    scenario_hints = team.scenario.tactical_hints if team.scenario else []
    hint_text = scenario_hints[min(hint_index - 1, len(scenario_hints) - 1)]

    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="HINT_REQUESTED",
        team_code=team.team_code,
        payload={"hint_number": op_state.hints_used, "max_hints": team.max_hints}
    )

    await broadcast_team_update(db, team_id, event_type="HINT_USED", extra={"hints_used": op_state.hints_used})

    return {
        "status": "SUCCESS",
        "hints_used": op_state.hints_used,
        "max_hints": team.max_hints,
        "hint": hint_text,
        "warning": "Efficiency penalty applied (-25 points)."
    }

# ----------------- STAGE TRANSITIONS -----------------
@router.post("/stage/advance", response_model=dict)
async def advance_stage(
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    op_state = get_scenario_progress(db, team)
    current_stage = op_state.current_stage

    if current_stage == "INVESTIGATE":
        # Check minimum investigation criteria (at least 2 evidences viewed or 1 finding created)
        progress = get_scenario_progress(db, team)
        viewed_count = len(progress.answers.get("viewed_evidence_ids", []))
        if viewed_count < 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must inspect at least 2 evidence records before proceeding to Analysis.")
        op_state.current_stage = "ANALYZE"
    elif current_stage == "ANALYZE":
        op_state.current_stage = "IDENTIFY"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot manually advance from stage '{current_stage}'.")

    db.commit()
    await broadcast_team_update(db, team_id, event_type="STAGE_ADVANCED", extra={"new_stage": op_state.current_stage})
    return {"status": "SUCCESS", "current_stage": op_state.current_stage}

# ----------------- STAGE 4: IDENTIFY -----------------
@router.post("/identify", response_model=dict)
async def submit_identification(
    id_data: schemas.IdentifySubmitRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    op_state = get_scenario_progress(db, team)
    if op_state.current_stage != "IDENTIFY":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot submit identification in stage '{op_state.current_stage}'.")

    scenario = team.scenario
    is_correct = (
        id_data.attack_type == scenario.attack_type and
        id_data.attack_vector == scenario.attack_vector and
        id_data.affected_asset == scenario.affected_asset and
        id_data.primary_ioc == scenario.primary_ioc
    )

    op_state.identification_submission_json = json.dumps({
        "attack_type": id_data.attack_type,
        "attack_vector": id_data.attack_vector,
        "affected_asset": id_data.affected_asset,
        "primary_ioc": id_data.primary_ioc
    })
    op_state.identification_correct = is_correct

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="IDENTIFY",
        team_code=team.team_code,
        payload={"is_correct": is_correct, "submission": id_data.dict()}
    )

    if is_correct:
        op_state.current_stage = "RESPOND"
        db.commit()
        await broadcast_team_update(db, team_id, event_type="STAGE_ADVANCED", extra={"new_stage": "RESPOND"})
        return {
            "status": "CORRECT",
            "message": "Identification verified! Accurate attack classification. Advancing to Response planning.",
            "next_stage": "RESPOND"
        }
    else:
        # Allow advancing with partial score or retry
        op_state.current_stage = "RESPOND"
        db.commit()
        await broadcast_team_update(db, team_id, event_type="STAGE_ADVANCED", extra={"new_stage": "RESPOND"})
        return {
            "status": "PARTIAL",
            "message": "Identification submitted with discrepancies. Score updated based on accurate fields. Proceeding to Response stage.",
            "next_stage": "RESPOND"
        }

# ----------------- STAGE 5: RESPOND -----------------
@router.post("/respond", response_model=dict)
async def submit_response(
    resp_data: schemas.ResponseSubmitRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    op_state = get_scenario_progress(db, team)
    if op_state.current_stage != "RESPOND":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot submit response in stage '{op_state.current_stage}'.")

    if not resp_data.selected_action_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must select at least one containment/recovery action.")

    op_state.selected_responses_json = json.dumps(resp_data.selected_action_ids)
    op_state.current_stage = "REPORT"
    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="RESPONSE",
        team_code=team.team_code,
        payload={"selected_actions": resp_data.selected_action_ids}
    )

    await broadcast_team_update(db, team_id, event_type="STAGE_ADVANCED", extra={"new_stage": "REPORT"})
    return {
        "status": "SUCCESS",
        "message": "Containment actions executed. Proceeding to Final Incident Report stage.",
        "next_stage": "REPORT"
    }

# ----------------- STAGE 6: REPORT -----------------
@router.get("/report", response_model=dict)
def get_report(
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    progress = get_scenario_progress(db, team)
    report = progress.report_data
    report["is_final"] = progress.report_submitted
    return report

@router.put("/report", response_model=dict)
async def update_report(
    report_data: schemas.ReportUpdateRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    progress = get_scenario_progress(db, team)
    if progress.report_submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Final report has already been submitted and cannot be edited.")

    report = progress.report_data
    report.update(report_data.dict(exclude_unset=True))
    progress.report_data_json = json.dumps(report)

    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="REPORT_UPDATE",
        team_code=team.team_code,
        payload={"updated_by": analyst_name}
    )

    await broadcast_team_update(db, team_id, event_type="REPORT_SAVED")
    return {"status": "SUCCESS", "message": "Incident report draft updated."}

@router.post("/report/submit", response_model=dict)
async def submit_final_report(
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    verify_operation_active(team)

    progress = get_scenario_progress(db, team)
    report = progress.report_data
    if not report:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Report draft does not exist.")

    # Validate 11 mandatory sections
    sections = {
        field["label"]: report.get(field["key"], "")
        for field in team.scenario.report_fields
    }

    missing = [name for name, val in sections.items() if not val or len(val.strip()) < 10]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All 11 report sections must be completed before submission. Incomplete: {', '.join(missing[:3])} ({len(missing)} total missing)."
        )

    progress.report_submitted = True
    progress.completion_status = "COMPLETED"
    progress.stage_status = "COMPLETED"
    progress.end_time = datetime.now(timezone.utc)

    db.commit()

    total_score, score_breakdown = calculate_team_score(db, team_id)

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="REPORT_SUBMIT",
        team_code=team.team_code,
        payload={"final_score": total_score}
    )

    await broadcast_team_update(db, team_id, event_type="OPERATION_COMPLETED", extra={"final_score": total_score})

    return {
        "status": "COMPLETED",
        "message": "Final Incident Response Report successfully submitted! Operation complete.",
        "final_score": total_score,
        "breakdown": {
            "detection": score_breakdown.detection_score,
            "investigation": score_breakdown.investigation_score,
            "analysis": score_breakdown.analysis_score,
            "identification": score_breakdown.identification_score,
            "response": score_breakdown.response_score,
            "evidence": score_breakdown.evidence_score,
            "report": score_breakdown.report_score,
            "efficiency": score_breakdown.efficiency_score
        }
    }

# ----------------- TAB SWITCH INTEGRITY -----------------
@router.post("/tab-switch", response_model=dict)
def log_tab_switch(
    tab_data: schemas.TabSwitchRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    actor = current_user.get("analyst_name") or current_user.get("email") or "User"
    role = current_user.get("role", "ANALYST")
    team_code = current_user.get("team_code")

    log_audit_event(
        db=db,
        actor=actor,
        role=role,
        action="TAB_SWITCH",
        team_code=team_code,
        payload={"blurred_at": str(tab_data.blurred_at) if tab_data.blurred_at else "Now"}
    )
    return {"status": "LOGGED"}

# ----------------- SCENARIO SWITCHING (ALL SCENARIOS ATTENDABLE) -----------------
@router.post("/switch-scenario", response_model=dict)
async def switch_team_scenario(
    req: schemas.TeamReassignRequest,
    current_user: dict = Depends(get_current_analyst),
    db: Session = Depends(get_db)
):
    team_id = current_user.get("team_id")
    analyst_name = current_user.get("analyst_name")
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found.")

    scenario = db.query(models.Scenario).filter(models.Scenario.id == req.scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found.")

    team.scenario_id = scenario.id
    db.commit()

    log_audit_event(
        db=db,
        actor=analyst_name,
        role="ANALYST",
        action="SWITCH_SCENARIO",
        team_code=team.team_code,
        payload={"scenario_id": scenario.id, "scenario_name": scenario.name}
    )

    await broadcast_team_update(db, team_id, event_type="SCENARIO_SWITCHED", extra={"scenario_id": scenario.id, "scenario_name": scenario.name})

    return {
        "status": "SUCCESS",
        "message": f"Attending scenario: {scenario.name}",
        "scenario_id": scenario.id,
        "scenario_name": scenario.name
    }

