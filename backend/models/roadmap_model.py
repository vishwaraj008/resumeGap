from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from config.db_config import Base


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(Integer, primary_key=True, index=True)
    match_result_id = Column(Integer, ForeignKey("match_results.id", ondelete="CASCADE"), nullable=False, index=True)
    skill = Column(String(255), nullable=False)
    course_recommendations = Column(JSON)
    estimated_duration = Column(String(50))
    sequence_order = Column(Integer)
