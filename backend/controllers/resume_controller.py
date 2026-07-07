"""
Resume controller — drives the upload → parse → extract → store pipeline.

Takes validated PDF bytes (or pasted text), extracts and cleans the text, runs
hybrid skill extraction, persists the resume and its extracted skills, and
returns the final skill list. The raw extraction breakdown is stored but kept out
of the response.
"""
import json
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from utils.pdf_extractor import extract_text_from_pdf
from utils.text_cleaning import normalize_whitespace
from services.skill_extraction_service import extract_skills_from_resume
from models.resume_model import Resume


def handle_resume_upload(db: Session, user_id: int, pdf_bytes: bytes) -> dict:
    """Processes a PDF resume upload end-to-end:
    1. Extract text from PDF bytes
    2. Run hybrid skill extraction (NER + keyword)
    3. Store everything in the resumes table
    4. Return only final_skills (not the internal breakdown)
    """
    raw_text = extract_text_from_pdf(pdf_bytes)
    cleaned_text = normalize_whitespace(raw_text)

    extraction_result = extract_skills_from_resume(cleaned_text)

    try:
        resume = Resume(
            user_id=user_id,
            raw_text_or_file_path=cleaned_text,
            extracted_skills=json.dumps(extraction_result["final_skills"]),
            extraction_breakdown=json.dumps({
                "found_by_both": extraction_result["found_by_both"],
                "found_by_ner_only": extraction_result["found_by_ner_only"],
                "found_by_keyword_only": extraction_result["found_by_keyword_only"],
            }),
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
    except SQLAlchemyError as e:
        db.rollback()
        raise ValueError(f"Failed to save resume to database: {e}")

    return {
        "resume_id": resume.id,
        "extracted_skills": extraction_result["final_skills"],
        "skill_count": len(extraction_result["final_skills"]),
    }


def handle_search_skills(query: str = "", limit: int = 20) -> dict:
    """Read-only lookup: returns skills from the master skill vocabulary,
    filtered by a case-insensitive substring `query`. Powers the frontend's
    manual skill-entry autocomplete so no skill list is hardcoded client-side.

    Prefix matches are ranked before mid-string matches.
    """
    from utils.model_loader import get_artifacts

    vocab = get_artifacts()["master_skills_vocab"]  # a set of lowercased skills

    q = (query or "").strip().lower()
    if q:
        matches = [s for s in vocab if q in s]
        matches.sort(key=lambda s: (not s.startswith(q), s))
    else:
        matches = sorted(vocab)

    limit = max(1, min(limit, 50))
    return {"skills": matches[:limit], "total_available": len(vocab)}


def handle_text_upload(db: Session, user_id: int, resume_text: str) -> dict:
    """Same flow as handle_resume_upload but for pasted plain text (no PDF extraction step)."""
    cleaned_text = normalize_whitespace(resume_text)

    if not cleaned_text:
        raise ValueError("Resume text is empty after cleaning")

    extraction_result = extract_skills_from_resume(cleaned_text)

    try:
        resume = Resume(
            user_id=user_id,
            raw_text_or_file_path=cleaned_text,
            extracted_skills=json.dumps(extraction_result["final_skills"]),
            extraction_breakdown=json.dumps({
                "found_by_both": extraction_result["found_by_both"],
                "found_by_ner_only": extraction_result["found_by_ner_only"],
                "found_by_keyword_only": extraction_result["found_by_keyword_only"],
            }),
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)
    except SQLAlchemyError as e:
        db.rollback()
        raise ValueError(f"Failed to save resume to database: {e}")

    return {
        "resume_id": resume.id,
        "extracted_skills": extraction_result["final_skills"],
        "skill_count": len(extraction_result["final_skills"]),
    }
