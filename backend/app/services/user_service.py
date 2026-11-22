"""User management service (admin only)."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserStatusIn, UserUpdate
from app.utils.pagination import PageParams, paginate

ADMIN = "ADMIN"


def _role_value(user: User) -> str:
    return getattr(user.role, "value", str(user.role))


def list_users(db: Session, params: PageParams, search: str | None, role: str | None,
               is_active: bool | None) -> tuple[list[User], int]:
    """List users with optional filters and pagination."""
    statement = select(User)
    if search:
        term = f"%{escape_like(search)}%"
        statement = statement.where(
            or_(
                User.full_name.ilike(term, escape="\\"),
                User.email.ilike(term, escape="\\"),
            )
        )
    if role:
        statement = statement.where(User.role == UserRole(role))
    if is_active is not None:
        statement = statement.where(User.is_active == is_active)
    statement = statement.order_by(User.created_at.desc(), User.id)
    return paginate(db, statement, params)


def escape_like(term: str) -> str:
    """Escape ILIKE wildcards."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def get_user(db: Session, user_id: UUID) -> User:
    """Fetch a user or raise 404."""
    user = db.get(User, user_id)
    if user is None:
        raise AppException(404, "USER_NOT_FOUND", "User not found")
    return user


def create_user(db: Session, payload: UserCreate) -> User:
    """Create a user (possibly another admin)."""
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise AppException(409, "DUPLICATE_EMAIL", "Email is already registered")
    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole(payload.role),
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


def update_user(db: Session, actor: User, user_id: UUID, payload: UserUpdate) -> User:
    """Update a user's name/role with self-protection and last-admin guard."""
    user = get_user(db, user_id)
    target_role = _role_value(user)

    if user.id == actor.id:
        if payload.role is not None and payload.role != target_role:
            raise AppException(409, "CANNOT_MODIFY_SELF", "You cannot change your own role")

    if payload.role is not None and payload.role != target_role:
        if target_role == ADMIN and _role_value(actor) == ADMIN:
            active_admins = db.scalar(
                select(func.count())
                .select_from(User)
                .where(User.role == UserRole.ADMIN, User.is_active.is_(True))
            )
            if active_admins is not None and active_admins <= 1:
                raise AppException(409, "LAST_ADMIN", "The last active admin cannot be demoted")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.role is not None:
        user.role = UserRole(payload.role)
    user.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppException(409, "DUPLICATE_EMAIL", "Email is already registered") from None
    db.refresh(user)
    return user


def set_user_status(db: Session, actor: User, user_id: UUID, payload: UserStatusIn) -> User:
    """Enable/disable a user with self-protection and last-admin guard."""
    user = get_user(db, user_id)

    if user.id == actor.id and not payload.is_active:
        raise AppException(409, "CANNOT_MODIFY_SELF", "You cannot deactivate yourself")

    if payload.is_active is False and _role_value(user) == ADMIN and user.is_active:
        active_admins = db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.role == UserRole.ADMIN, User.is_active.is_(True))
        )
        if active_admins is not None and active_admins <= 1:
            raise AppException(409, "LAST_ADMIN", "The last active admin cannot be deactivated")

    user.is_active = payload.is_active
    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user
