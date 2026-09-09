import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import models

def log_audit_event(
    db: Session,
    actor: str,
    role: str,
    action: str,
    team_code: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
) -> models.AuditLog:
    """Records an authoritative audit event to the database."""
    entry = models.AuditLog(
        actor=actor,
        role=role,
        action=action,
        team_code=team_code,
        payload_json=json.dumps(payload or {}),
        ip_address=ip_address
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
