from typing import Tuple
from types import SimpleNamespace
from sqlalchemy.orm import Session
import models

def calculate_team_score(db: Session, team_id: int) -> Tuple[float, models.Score]:
    """
    Authoritative server-side 1000-point scoring engine.
    Calculates normalized scores across all categories:
    - Detection: 100 pts
    - Investigation: 200 pts
    - Analysis: 150 pts
    - Identification: 150 pts
    - Response: 200 pts
    - Evidence Chain: 100 pts
    - Report: 100 pts
    - Efficiency deduction (-25 per hint)
    Total is clamped strictly between 0 and 1000.
    """
    team = db.query(models.Team).filter(models.Team.id == team_id).first()
    if not team:
        return 0.0, None

    op_state = next((p for p in team.scenario_progress if p.scenario_id == team.scenario_id), None)
    scenario = team.scenario

    detection_score = 0.0
    investigation_score = 0.0
    analysis_score = 0.0
    identification_score = 0.0
    response_score = 0.0
    evidence_score = 0.0
    report_score = 0.0
    efficiency_score = 0.0

    total_decisions = 0
    correct_decisions = 0

    if op_state and scenario:
        # 1. Detection (100 pts)
        if op_state.detection_correct:
            total_decisions += 1
            correct_decisions += 1
            penalty = max(0, (op_state.detection_attempts - 1) * 20)
            detection_score = max(20.0, 100.0 - penalty)
        elif op_state.detection_attempts > 0:
            total_decisions += 1

        # 2. Investigation (200 pts)
        evidences = db.query(models.Evidence).filter(models.Evidence.scenario_id == scenario.id).all()
        total_evidence_count = len(evidences)
        viewed_ids = set(op_state.answers.get("viewed_evidence_ids", []))
        viewed_count = len(viewed_ids)

        # Ratio of evidence inspected (up to 100 pts)
        if total_evidence_count > 0:
            investigation_score += (viewed_count / total_evidence_count) * 100.0

        # Findings created (up to 50 pts, 15 pts each)
        findings_count = len(op_state.findings)
        investigation_score += min(50.0, findings_count * 15.0)

        # IOC searches executed (up to 50 pts, 10 pts each)
        ioc_searches_count = op_state.answers.get("ioc_search_count", 0)
        investigation_score += min(50.0, ioc_searches_count * 10.0)
        investigation_score = min(200.0, investigation_score)

        # 3. Analysis (150 pts) - Accuracy of evidence tagging
        evidence_dict = {e.id: e for e in evidences}
        evidence_flags = op_state.answers.get("evidence_flags", {})
        analysis_points = 0.0
        for evidence_id, flag in evidence_flags.items():
            ev = evidence_dict.get(int(evidence_id))
            if not ev:
                continue
            if flag == "suspicious":
                total_decisions += 1
                if ev.is_suspicious:
                    analysis_points += 20.0
                    correct_decisions += 1
                else:
                    analysis_points -= 10.0
            elif flag == "benign":
                total_decisions += 1
                if not ev.is_suspicious:
                    analysis_points += 20.0
                    correct_decisions += 1
                else:
                    analysis_points -= 10.0
        analysis_score = max(0.0, min(150.0, analysis_points))

        # 4. Identification (150 pts)
        id_sub = op_state.identification_submission
        if id_sub:
            # Attack type (40 pts)
            total_decisions += 4
            if id_sub.get("attack_type") == scenario.attack_type:
                identification_score += 40.0
                correct_decisions += 1
            # Attack vector (40 pts)
            if id_sub.get("attack_vector") == scenario.attack_vector:
                identification_score += 40.0
                correct_decisions += 1
            # Affected asset (35 pts)
            if id_sub.get("affected_asset") == scenario.affected_asset:
                identification_score += 35.0
                correct_decisions += 1
            # Primary IOC (35 pts)
            if id_sub.get("primary_ioc") == scenario.primary_ioc:
                identification_score += 35.0
                correct_decisions += 1

        # 5. Response Actions (200 pts)
        selected_resps = set(op_state.selected_responses)
        scenario_resps = {r.get("id"): r for r in scenario.response_actions}
        if selected_resps:
            r_points = 0.0
            for resp_id in selected_resps:
                action = scenario_resps.get(resp_id)
                if not action:
                    continue
                total_decisions += 1
                classification = action.get("classification")
                if classification == "CORRECT":
                    r_points += 50.0
                    correct_decisions += 1
                elif classification == "DANGEROUS":
                    r_points -= 40.0
                else:  # INCORRECT
                    r_points -= 15.0
            response_score = max(0.0, min(200.0, r_points))

        # 6. Authoritative Evidence Coverage (100 pts)
        auth_evidences = [e for e in evidences if e.is_authoritative]
        if auth_evidences:
            viewed_auth_count = sum(1 for e in auth_evidences if e.id in viewed_ids)
            evidence_score = (viewed_auth_count / len(auth_evidences)) * 100.0

        # 7. Incident Report (100 pts)
        report = op_state.report_data
        if report:
            sections = [report.get(field["key"], "") for field in scenario.report_fields]
            completed_sections = sum(1 for s in sections if s and len(s.strip()) >= 10)
            report_score = (completed_sections / 11.0) * 100.0

        # 8. Efficiency & Hints Deduction
        hints_used = op_state.hints_used
        efficiency_deduction = hints_used * 25.0
        efficiency_score = -efficiency_deduction

    raw_total = (
        detection_score +
        investigation_score +
        analysis_score +
        identification_score +
        response_score +
        evidence_score +
        report_score +
        efficiency_score
    )
    total_score = max(0.0, min(1000.0, raw_total))
    
    accuracy_percentage = (correct_decisions / total_decisions * 100.0) if total_decisions > 0 else 0.0

    # Persist or update Score record
    breakdown = {
        "detection_score": round(detection_score, 1),
        "investigation_score": round(investigation_score, 1),
        "analysis_score": round(analysis_score, 1),
        "identification_score": round(identification_score, 1),
        "response_score": round(response_score, 1),
        "evidence_score": round(evidence_score, 1),
        "report_score": round(report_score, 1),
        "efficiency_score": round(efficiency_score, 1),
        "accuracy_percentage": round(accuracy_percentage, 1)
    }
    op_state.score = round(total_score, 1)
    op_state.score_breakdown_json = __import__("json").dumps(breakdown)
    team.score = op_state.score
    db.commit()
    db.refresh(op_state)
    return total_score, SimpleNamespace(total_score=op_state.score, **breakdown)
