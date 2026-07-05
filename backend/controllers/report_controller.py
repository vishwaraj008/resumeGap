import json
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from models.match_result_model import MatchResult
from models.resume_model import Resume
from models.roadmap_model import Roadmap
from services.roadmap_service import get_learning_roadmap
from services.pdf_report_service import generate_pdf_report


def handle_generate_report(db: Session, user_id: int, match_result_id: int) -> bytes:
    """Gathers all data for a match result (skill gap + roadmap + trajectory),
    renders it into a PDF, and returns the raw PDF bytes.

    Uses already-computed data from DB where available. Falls back to
    regenerating the roadmap if it hasn't been persisted yet."""

    # fetch match result
    try:
        match_result = db.query(MatchResult).filter(MatchResult.id == match_result_id).first()
    except SQLAlchemyError as e:
        raise ValueError(f"Database error fetching match result: {e}")

    if not match_result:
        raise ValueError(f"Match result {match_result_id} not found")

    # verify ownership through the resume
    try:
        resume = db.query(Resume).filter(
            Resume.id == match_result.resume_id,
            Resume.user_id == user_id,
        ).first()
    except SQLAlchemyError as e:
        raise ValueError(f"Database error verifying ownership: {e}")

    if not resume:
        raise ValueError("Match result doesn't belong to this user")

    # parse stored skills
    extracted_skills = resume.extracted_skills
    if isinstance(extracted_skills, str):
        extracted_skills = json.loads(extracted_skills)

    missing_skills = match_result.missing_skills
    if isinstance(missing_skills, str):
        missing_skills = json.loads(missing_skills)

    # figure out matched skills (user skills that ARE in the job's required set)
    # this is the complement of missing_skills relative to extracted_skills
    missing_set = {s.lower() for s in (missing_skills or [])}
    matched_skills = [s for s in (extracted_skills or []) if s.lower() not in missing_set]

    # generate the roadmap data (includes course recs, trajectory, time estimate)
    roadmap_data = get_learning_roadmap(
        missing_skills=missing_skills or [],
        target_role=match_result.target_role,
        match_percent=match_result.match_percent,
        resource_type="all",
    )

    pdf_bytes = generate_pdf_report(
        target_role=match_result.target_role,
        match_percent=match_result.match_percent,
        matched_skills=matched_skills,
        missing_skills=missing_skills or [],
        roadmap=roadmap_data.get("roadmap", []),
        total_estimated_hours=roadmap_data.get("total_estimated_hours", 0),
        trajectory_graph=roadmap_data.get("trajectory_graph", {}),
    )

    return pdf_bytes
