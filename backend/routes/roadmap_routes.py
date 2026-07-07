"""
Roadmap route — `GET /roadmap/{match_result_id}`.

Protected. Returns the ordered learning roadmap and career trajectory for a match
result. The `resource_type` query param (`all` | `free` | `paid`) filters which
learning resources are included.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from config.db_config import get_db
from middleware.auth_middleware import get_current_user
from controllers.roadmap_controller import handle_get_roadmap
from models.user_model import User

router = APIRouter()


@router.get("/{match_result_id}")
def get_roadmap(
    match_result_id: int,
    resource_type: str = Query("all", regex="^(all|free|paid)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the roadmap + trajectory for a match result, filtered by resource_type."""
    try:
        return handle_get_roadmap(db, current_user.id, match_result_id, resource_type)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))