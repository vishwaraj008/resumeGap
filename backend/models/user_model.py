"""SQLAlchemy ORM model for the `users` table."""
from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from config.db_config import Base


class User(Base):
    """A registered account. `email` is unique; `password_hash` stores a bcrypt
    hash (never plaintext). One user owns many resumes (see Resume.user_id)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())