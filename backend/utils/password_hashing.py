"""
Password hashing helpers (bcrypt via passlib).

Wraps a single shared `CryptContext` so the rest of the app never touches the
hashing library directly. Used by the auth service at registration (hash) and
login (verify).
"""
from passlib.context import CryptContext
from passlib.exc import UnknownHashError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Returns a bcrypt hash of the given plaintext password.

    Raises ValueError if hashing fails."""
    try:
        return pwd_context.hash(plain_password)
    except Exception as e:
        raise ValueError(f"Password hashing failed: {e}")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Checks a plaintext password against a stored bcrypt hash.

    Returns False on mismatch or if the stored hash is corrupt/invalid; raises
    ValueError only on unexpected failures."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        # hashed_password is corrupted/not a valid bcrypt hash — treat as verification failure, not a crash
        return False
    except Exception as e:
        raise ValueError(f"Password verification failed: {e}")