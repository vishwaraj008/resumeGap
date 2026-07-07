import os
import secrets
from pathlib import Path
from datetime import datetime, timedelta
from jose import jwt, JWTError, ExpiredSignatureError
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from models.user_model import User
from utils.password_hashing import hash_password, verify_password


def _resolve_jwt_secret() -> str:
    """Resolves the JWT signing key without ever shipping a usable secret in the repo.

    Precedence:
      1. JWT_SECRET_KEY env var — set this (via .env) for production or when
         running multiple backend instances that must share one key.
      2. A persisted, auto-generated secret — so a fresh clone runs with zero
         config. Generated once with cryptographic randomness and written to
         JWT_SECRET_FILE (kept on a Docker volume), so issued tokens survive
         container restarts. Only regenerates if that file is lost.

    Raises RuntimeError only if no key is set AND the secret store isn't
    writable — in that case set JWT_SECRET_KEY explicitly.
    """
    env_secret = os.getenv("JWT_SECRET_KEY")
    if env_secret:
        return env_secret

    secret_file = Path(os.getenv("JWT_SECRET_FILE", "/app/.secrets/jwt_secret"))
    try:
        if secret_file.exists():
            existing = secret_file.read_text().strip()
            if existing:
                return existing

        secret_file.parent.mkdir(parents=True, exist_ok=True)
        generated = secrets.token_urlsafe(64)
        secret_file.write_text(generated)
        try:
            secret_file.chmod(0o600)
        except OSError:
            pass  # best-effort; some volume backends don't support chmod
        return generated
    except OSError as e:
        raise RuntimeError(
            f"JWT_SECRET_KEY is not set and the auto-generated secret store at "
            f"'{secret_file}' is not writable ({e}). Set JWT_SECRET_KEY in your environment."
        )


JWT_SECRET_KEY = _resolve_jwt_secret()
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