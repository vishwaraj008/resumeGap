from sqlalchemy import Column, Integer, Float, String, ForeignKey, JSON, TIMESTAMP, func
from config.db_config import Base


class MatchResult(Base):
    __tablename__ = "match_results"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    target_role = Column(String(255), nullable=False)
    match_percent = Column(Float, nullable=False)
    missing_skills = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())
