"""
Authentication middleware — the `get_current_user` FastAPI dependency.

Protected routes declare `Depends(get_current_user)`; it extracts the Bearer
token, verifies the JWT via the auth service, loads the matching user row, and
returns it. Any failure (bad/expired token, unknown user, DB error) is turned
into the appropriate HTTP 401/500 so route handlers can assume a valid user.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from config.db_config import get_db
from services.auth_service import decode_access_token
from models.user_model import User

security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency — verifies the JWT on protected routes and returns the current user."""
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing user identifier")

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except SQLAlchemyError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")

    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user