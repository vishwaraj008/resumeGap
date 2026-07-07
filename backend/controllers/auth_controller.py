"""
Auth controller — orchestrates registration and login.

Thin layer between the auth routes and the auth service: calls the service to
create/authenticate a user, mints an access token, and shapes the
`{access_token, token_type}` response. Business logic and validation live in the
service; this just coordinates.
"""
from sqlalchemy.orm import Session

from services.auth_service import register_new_user, authenticate_user, create_access_token


def handle_register(db: Session, email: str, password: str) -> dict:
    """Registers a new user and returns an access token, or raises ValueError on failure."""
    try:
        user = register_new_user(db, email, password)
        token = create_access_token(user.id, user.email)
        return {"access_token": token, "token_type": "bearer"}
    except ValueError:
        raise  # already a clean, specific error from the service layer — pass it straight to the route


def handle_login(db: Session, email: str, password: str) -> dict:
    """Authenticates a user and returns an access token, or raises ValueError on failure."""
    try:
        user = authenticate_user(db, email, password)
        token = create_access_token(user.id, user.email)
        return {"access_token": token, "token_type": "bearer"}
    except ValueError:
        raise