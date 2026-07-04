import json
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from models.match_result_model import MatchResult
from models.resume_model import Resume
from models.roadmap_model import Roadmap
from services.roadmap_service import get_learning_roadmap


def handle_get_roadmap(db: Session, user_id: int, match_result_id: int, resource_type: str = "all") -> dict:
    """Fetches a stored match result, generates (or retrieves) the learning roadmap,
    persists roadmap items to DB, and returns the full response."""

    # fetch the match result and verify ownership
    try:
        match_result = db.query(MatchResult).filter(MatchResult.id == match_result_id).first()
    except SQLAlchemyError as e:
        raise ValueError(f"Database error fetching match result: {e}")

    if not match_result:
        raise ValueError(f"Match result {match_result_id} not found")

    # verify the resume belongs to this user
    try:
        resume = db.query(Resume).filter(
            Resume.id == match_result.resume_id,
            Resume.user_id == user_id,
        ).first()
    except SQLAlchemyError as e:
        raise ValueError(f"Database error verifying resume ownership: {e}")

    if not resume:
        raise ValueError("Match result doesn't belong to this user")

    missing_skills = match_result.missing_skills
    if isinstance(missing_skills, str):
        missing_skills = json.loads(missing_skills)

    if not missing_skills:
        return {
            "match_result_id": match_result_id,
            "target_role": match_result.target_role,
            "match_percent": match_result.match_percent,
            "message": "No missing skills — you're already a great fit for this role!",
            "roadmap": [],
            "trajectory_graph": {},
        }

    roadmap_data = get_learning_roadmap(
        missing_skills=missing_skills,
        target_role=match_result.target_role,
        match_percent=match_result.match_percent,
        resource_type=resource_type,
    )

    # persist roadmap items to DB (replace any existing ones for this match result)
    try:
        db.query(Roadmap).filter(Roadmap.match_result_id == match_result_id).delete()

        for item in roadmap_data["roadmap"]:
            roadmap_row = Roadmap(
                match_result_id=match_result_id,
                skill=item["skill"],
                course_recommendations=json.dumps(item["course_recommendations"]),
                estimated_duration=f"{item['estimated_duration_hours']}h",
                sequence_order=item["sequence_order"],
            )
            db.add(roadmap_row)

        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        raise ValueError(f"Failed to save roadmap to database: {e}")

    roadmap_data["match_result_id"] = match_result_id
    return roadmap_data
