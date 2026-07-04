from passlib.context import CryptContext
from passlib.exc import UnknownHashError

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    try:
        return pwd_context.hash(plain_password)
    except Exception as e:
        raise ValueError(f"Password hashing failed: {e}")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except UnknownHashError:
        # hashed_password is corrupted/not a valid bcrypt hash — treat as verification failure, not a crash
        return False
    except Exception as e:
        raise ValueError(f"Password verification failed: {e}")