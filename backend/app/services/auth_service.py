"""Authentication service: registration, login and token creation."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import LoginIn, RegisterIn


def register_user(db: Session, payload: RegisterIn) -> User:
    """Register a customer; the role is never taken from the request."""
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing is not None:
        raise AppException(409, "DUPLICATE_EMAIL", "Email is already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppException(409, "DUPLICATE_EMAIL", "Email is already registered") from None
    db.refresh(user)
    return user


def authenticate(db: Session, payload: LoginIn) -> User:
    """Return the authenticated user or raise 401 with the same message for all failures."""
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise AppException(401, "INVALID_CREDENTIALS", "Invalid email or password")
    if not user.is_active:
        raise AppException(403, "USER_INACTIVE", "User account is inactive")
    return user


def create_token_for(user: User) -> str:
    """Create an access token for a user."""
    return create_access_token(
        {"sub": str(user.id), "role": getattr(user.role, "value", user.role)}
    )
