"""SQLAlchemy ORM model for the `resumes` table."""
from sqlalchemy import Column, Integer, ForeignKey, Text, JSON, TIMESTAMP, func
from config.db_config import Base


class Resume(Base):
    """An uploaded resume and its extracted skills.

    Columns:
        user_id: owner (FK to users, cascade-deleted with the user).
        raw_text_or_file_path: the extracted resume text (or a stored path).
        extracted_skills: JSON list of skills the NER model found.
        extraction_breakdown: JSON detail of how skills were extracted
            (source spans / normalization), for transparency and debugging.
    """
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())
    raw_text_or_file_path = Column(Text)
    extracted_skills = Column(JSON)
    extraction_breakdown = Column(JSON)
