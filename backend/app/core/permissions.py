"""Authentication and authorization dependencies."""

from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

security = HTTPBearer(auto_error=False)
DbSession = Annotated[Session, Depends(get_db)]


def role_of(user: User) -> str:
    """Return the user's role as its stored string value."""
    return getattr(user.role, "value", str(user.role))


def _load_user(db: Session, credentials: HTTPAuthorizationCredentials | None) -> User | None:
    """Load the user referenced by a token, or None for any invalid token."""
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
        subject = payload.get("sub")
        if not subject:
            return None
        user_id = UUID(str(subject))
    except Exception:
        return None
    return db.scalar(select(User).where(User.id == user_id))


def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: DbSession,
) -> User:
    """Require a valid token and an active user."""
    user = _load_user(db, credentials)
    if user is not None:
        request.state.user_id = str(user.id)
    if user is None:
        raise AppException(401, "TOKEN_INVALID", "Invalid or expired authentication token")
    if not user.is_active:
        raise AppException(403, "USER_INACTIVE", "User account is inactive")
    return user


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: DbSession,
) -> User | None:
    """Return the user for a valid token, otherwise behave as a guest."""
    user = _load_user(db, credentials)
    if user is None or not user.is_active:
        return None
    return user


def require_roles(*roles: str) -> Callable[..., User]:
    """Build a dependency that allows only the given roles."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = getattr(current_user.role, "value", current_user.role)
        if user_role not in roles:
            raise AppException(403, "FORBIDDEN", "Insufficient permissions")
        return current_user

    return role_checker


CurrentUser = Annotated[User, Depends(get_current_user)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
AdminUser = Annotated[User, Depends(require_roles("ADMIN"))]
CustomerUser = Annotated[User, Depends(require_roles("CUSTOMER"))]
