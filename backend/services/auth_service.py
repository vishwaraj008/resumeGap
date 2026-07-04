import os
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from models.user_model import User
from utils.password_hashing import hash_password, verify_password

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is not set — check your .env file")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", 24))


def register_new_user(db: Session, email: str, password: str) -> User:
    """Creates a new user with a hashed password. Raises ValueError on duplicate email or DB failure."""
    try:
        existing_user = db.query(User).filter(User.email == email).first()
    except SQLAlchemyError as e:
        raise ValueError(f"Database error while checking existing user: {e}")

    if existing_user:
        raise ValueError("Email already registered")

    hashed = hash_password(password)  # already raises ValueError internally on failure

    try:
        new_user = User(email=email, password_hash=hashed)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except SQLAlchemyError as e:
        db.rollback()
        raise ValueError(f"Database error while creating user: {e}")

    return new_user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Verifies credentials, returns the user if valid. Raises ValueError otherwise."""
    try:
        user = db.query(User).filter(User.email == email).first()
    except SQLAlchemyError as e:
        raise ValueError(f"Database error while fetching user: {e}")

    if not user or not verify_password(password, user.password_hash):
        raise ValueError("Invalid email or password")

    return user


def create_access_token(user_id: int, email: str) -> str:
    """Issues a signed JWT for a logged-in/registered user."""
    try:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
        payload = {"sub": str(user_id), "email": email, "exp": expire}
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    except Exception as e:
        raise ValueError(f"Failed to create access token: {e}")


def decode_access_token(token: str) -> dict:
    """Decodes and validates a JWT. Raises ValueError if invalid/expired."""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise ValueError("Token has expired")
    except JWTError:
        raise ValueError("Invalid token")