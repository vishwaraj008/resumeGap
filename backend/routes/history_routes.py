"""
History route — `GET /history/`.

Protected. Returns the authenticated user's past resumes and match results,
newest first, for the History page.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from config.db_config import get_db
from middleware.auth_middleware import get_current_user
from controllers.history_controller import handle_get_history
from models.user_model import User

router = APIRouter()


@router.get("/")
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the current user's resumes and their match results, newest first."""
    try:
        return handle_get_history(db, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))