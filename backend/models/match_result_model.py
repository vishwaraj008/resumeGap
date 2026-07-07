"""SQLAlchemy ORM model for the `match_results` table."""
from sqlalchemy import Column, Integer, Float, String, ForeignKey, JSON, TIMESTAMP, func
from config.db_config import Base


class MatchResult(Base):
    """One resume-vs-role analysis result.

    Columns:
        resume_id: the analyzed resume (FK, cascade-deleted with the resume).
        target_role: the job title the resume was compared against.
        match_percent: importance-weighted skill-coverage score (0-100), the
            same value shown in the UI ring.
        missing_skills: JSON list of required skills the resume lacks — the
            input to roadmap generation.
    """
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role = Column(String(255), nullable=False)
    match_percent = Column(Float, nullable=False)
    missing_skills = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())
