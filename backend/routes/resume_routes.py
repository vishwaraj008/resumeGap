from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config.db_config import get_db
from middleware.auth_middleware import get_current_user
from middleware.upload_validator import validate_resume_upload
from controllers.resume_controller import handle_resume_upload, handle_text_upload, handle_search_skills
from models.user_model import User

router = APIRouter()


class TextUploadRequest(BaseModel):
    resume_text: str


@router.get("/skills")
def search_skills(
    q: str = Query("", description="Case-insensitive substring to filter skills"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """Type-ahead source for manual skill entry. Returns skills from the master vocabulary."""
    try:
        return handle_search_skills(q, limit)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accepts a PDF resume, extracts skills via hybrid NER+keyword, stores in DB."""
    pdf_bytes = await validate_resume_upload(file)

    try:
        result = handle_resume_upload(db, current_user.id, pdf_bytes)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/upload-text")
def upload_resume_text(
    payload: TextUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accepts pasted resume text, extracts skills via hybrid NER+keyword, stores in DB."""
    try:
        result = handle_text_upload(db, current_user.id, payload.resume_text)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))