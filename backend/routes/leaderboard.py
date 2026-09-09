from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])

@router.get("", response_model=List[schemas.LeaderboardEntry])
def get_leaderboard(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    teams = db.query(models.Team).order_by(models.Team.score.desc()).all()

    leaderboard = []
    for idx, team in enumerate(teams, start=1):
        score_rec = team.score_breakdown
        op_state = team.operation_state
        leaderboard.append(schemas.LeaderboardEntry(
            rank=idx,
            team_name=team.team_name,
            team_code=team.team_code,
            scenario_name=team.scenario.name if team.scenario else "Unassigned",
            score=team.score,
            accuracy_percentage=score_rec.accuracy_percentage if score_rec else 0.0,
            efficiency_score=score_rec.efficiency_score if score_rec else 0.0,
            current_stage=op_state.current_stage if op_state else "DETECT",
            status=team.status,
            completed=(team.status == "COMPLETED")
        ))
    return leaderboard
