"""Users router (admin only)."""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.permissions import AdminUser, DbSession
from app.schemas.common import Envelope, PageEnvelope
from app.schemas.user import PageParams, UserCreate, UserOut, UserStatusIn, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PageEnvelope[UserOut], summary="List users")
def list_users(
    admin: AdminUser,
    db: DbSession,
    params: PageParams = Depends(),
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
) -> dict:
    """List users with filters and pagination."""
    rows, total = user_service.list_users(db, params, search, role, is_active)
    return {
        "data": {
            "items": [UserOut.model_validate(row) for row in rows],
            "total": total,
            "page": params.page,
            "page_size": params.page_size,
        },
        "message": "Users list",
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=Envelope[UserOut],
    summary="Create a user",
)
def create_user(payload: UserCreate, admin: AdminUser, db: DbSession) -> dict:
    """Create a customer or another administrator."""
    user = user_service.create_user(db, payload)
    return {"data": UserOut.model_validate(user), "message": "User created"}


@router.patch("/{user_id}", response_model=Envelope[UserOut], summary="Update a user")
def update_user(
    user_id: UUID, payload: UserUpdate, admin: AdminUser, db: DbSession
) -> dict:
    """Update name, phone or role with self/last-admin protections."""
    user = user_service.update_user(db, admin, user_id, payload)
    return {"data": UserOut.model_validate(user), "message": "User updated"}


@router.patch("/{user_id}/status", response_model=Envelope[UserOut], summary="Set user status")
def set_user_status(
    user_id: UUID, payload: UserStatusIn, admin: AdminUser, db: DbSession
) -> dict:
    """Activate or deactivate an account."""
    user = user_service.set_user_status(db, admin, user_id, payload)
    return {"data": UserOut.model_validate(user), "message": "User status updated"}
