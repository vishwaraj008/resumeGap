"""
Auth routes — `/auth/register` and `/auth/login`.

Public endpoints (no token required). Both accept an email + password and return
a bearer access token on success. Maps service errors to HTTP status codes:
duplicate/invalid registration -> 400, bad credentials -> 401.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from config.db_config import get_db
from controllers.auth_controller import handle_register, handle_login

router = APIRouter()


class AuthRequest(BaseModel):
    """Request body for register/login: a valid email and a plaintext password."""
    email: EmailStr
    password: str


@router.post("/register")
def register(payload: AuthRequest, db: Session = Depends(get_db)):
    """Creates a new account and returns an access token. 400 if the email is taken/invalid."""
    try:
        return handle_register(db, payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {e}")


@router.post("/login")
def login(payload: AuthRequest, db: Session = Depends(get_db)):
    """Authenticates credentials and returns an access token. 401 on bad email/password."""
    try:
        return handle_login(db, payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {e}")