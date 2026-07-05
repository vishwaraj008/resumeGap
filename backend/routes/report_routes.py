from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config.db_config import get_db
from middleware.auth_middleware import get_current_user
from controllers.report_controller import handle_generate_report
from models.user_model import User

router = APIRouter()


class ReportRequest(BaseModel):
    match_result_id: int


@router.post("/generate")
def generate_report(
    payload: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generates a PDF report for a given match result and returns it as a downloadable file."""
    try:
        pdf_bytes = handle_generate_report(db, current_user.id, payload.match_result_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=skill_gap_report.pdf"},
    )
