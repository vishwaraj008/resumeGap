from sqlalchemy import Column, Integer, ForeignKey, Text, JSON, TIMESTAMP, func
from config.db_config import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_at = Column(TIMESTAMP, server_default=func.now())
    raw_text_or_file_path = Column(Text)
    extracted_skills = Column(JSON)
    extraction_breakdown = Column(JSON)
