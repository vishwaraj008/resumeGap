from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config.db_config import get_db
from middleware.auth_middleware import get_current_user
from controllers.matching_controller import handle_analyze, handle_compare
from models.user_model import User

router = APIRouter()


class AnalyzeRequest(BaseModel):
    resume_id: int
    target_role: str


class CompareRequest(BaseModel):
    resume_id: int
    target_roles: list[str]


@router.post("/analyze")
def analyze_match(
    payload: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return handle_analyze(db, current_user.id, payload.resume_id, payload.target_role)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/compare")
def compare_roles(
    payload: CompareRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return handle_compare(db, current_user.id, payload.resume_id, payload.target_roles)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))