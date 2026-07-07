"""
History controller — assembles a user's past activity.

Reads the user's resumes and their associated match results (newest first) and
shapes them into the history payload rendered by the frontend History page.
Read-only; no external services involved.
"""
import json
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from models.resume_model import Resume
from models.match_result_model import MatchResult


def handle_get_history(db: Session, user_id: int) -> dict:
    """Returns the user's past resumes and their associated match results, newest first."""
    try:
        resumes = (
            db.query(Resume)
            .filter(Resume.user_id == user_id)
            .order_by(Resume.uploaded_at.desc())
            .all()
        )
    except SQLAlchemyError as e:
        raise ValueError(f"Database error fetching history: {e}")

    if not resumes:
        return {"history": [], "total_resumes": 0}

    history = []
    for resume in resumes:
        skills = resume.extracted_skills
        if isinstance(skills, str):
            skills = json.loads(skills)

        # fetch match results for this resume
        try:
            matches = (
                db.query(MatchResult)
                .filter(MatchResult.resume_id == resume.id)
                .order_by(MatchResult.created_at.desc())
                .all()
            )
        except SQLAlchemyError:
            matches = []

        match_entries = []
        for m in matches:
            missing = m.missing_skills
            if isinstance(missing, str):
                missing = json.loads(missing)

            match_entries.append({
                "match_result_id": m.id,
                "target_role": m.target_role,
                "match_percent": m.match_percent,
                "missing_skills_count": len(missing) if missing else 0,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            })

        history.append({
            "resume_id": resume.id,
            "uploaded_at": resume.uploaded_at.isoformat() if resume.uploaded_at else None,
            "skill_count": len(skills) if skills else 0,
            "extracted_skills": skills,
            "analyses": match_entries,
        })

    return {"history": history, "total_resumes": len(history)}
