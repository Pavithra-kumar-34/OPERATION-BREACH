from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import verify_password, create_access_token, get_current_user
from services.audit import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/admin/login", response_model=schemas.TokenResponse)
def admin_login(
    login_data: schemas.AdminLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    admin = db.query(models.Admin).filter(models.Admin.email == login_data.email.lower().strip()).first()
    if not admin or not verify_password(login_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator credentials."
        )

    access_token = create_access_token(
        data={"sub": admin.email, "role": "ADMIN", "admin_id": admin.id}
    )

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        actor=admin.email,
        role="ADMIN",
        action="ADMIN_LOGIN",
        payload={"email": admin.email},
        ip_address=client_ip
    )

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="ADMIN",
        user_info={
            "id": admin.id,
            "email": admin.email,
            "role": "ADMIN"
        }
    )

@router.post("/participant/login", response_model=schemas.TokenResponse)
def participant_login(
    login_data: schemas.ParticipantLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    team_code = login_data.team_code.strip().upper()
    analyst_name = login_data.analyst_name.strip()

    if not team_code or not analyst_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both Analyst Name and Team Code are required."
        )

    team = db.query(models.Team).filter(models.Team.team_code == team_code).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No team found with Team Code '{team_code}'. Please verify with your competition administrator."
        )

    # Validate analyst name matches either analyst 1 or analyst 2
    a1_match = team.analyst_1_name.lower().strip() == analyst_name.lower()
    a2_match = team.analyst_2_name.lower().strip() == analyst_name.lower()

    if not (a1_match or a2_match):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Analyst '{analyst_name}' is not registered under team '{team.team_name}' ({team_code}). Valid analysts: {team.analyst_1_name}, {team.analyst_2_name}."
        )

    # Use the canonical casing stored in team record
    canonical_name = team.analyst_1_name if a1_match else team.analyst_2_name

    access_token = create_access_token(
        data={
            "sub": canonical_name,
            "role": "ANALYST",
            "team_id": team.id,
            "team_code": team.team_code
        }
    )

    client_ip = request.client.host if request.client else None
    log_audit_event(
        db=db,
        actor=canonical_name,
        role="ANALYST",
        action="PARTICIPANT_LOGIN",
        team_code=team.team_code,
        payload={"team_name": team.team_name, "analyst": canonical_name},
        ip_address=client_ip
    )

    return schemas.TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role="ANALYST",
        user_info={
            "analyst_name": canonical_name,
            "team_id": team.id,
            "team_name": team.team_name,
            "team_code": team.team_code,
            "scenario_id": team.scenario_id,
            "role": "ANALYST"
        }
    )

@router.get("/me", response_model=schemas.UserMeResponse)
def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = current_user.get("role")
    if role == "ADMIN":
        return schemas.UserMeResponse(
            role="ADMIN",
            email=current_user.get("email")
        )
    elif role == "ANALYST":
        team_id = current_user.get("team_id")
        team = db.query(models.Team).filter(models.Team.id == team_id).first()
        return schemas.UserMeResponse(
            role="ANALYST",
            analyst_name=current_user.get("analyst_name"),
            team_id=team_id,
            team_name=team.team_name if team else None,
            team_code=team.team_code if team else None,
            scenario_id=team.scenario_id if team else None
        )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown user identity.")
