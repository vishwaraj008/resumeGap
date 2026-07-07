"""
Database configuration and SQLAlchemy session factory.

Builds the MySQL connection URL from environment variables (DB_HOST, DB_PORT,
DB_NAME, DB_USER, DB_PASSWORD — host/port default to the Docker service names),
creates a pooled engine with `pool_pre_ping` to survive dropped connections, and
exposes `get_db()`, the FastAPI dependency that yields a session per request and
guarantees it is closed.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from sqlalchemy.orm import declarative_base

Base = declarative_base()

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "mysql")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for FastAPI routes — yields a DB session and guarantees it closes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()