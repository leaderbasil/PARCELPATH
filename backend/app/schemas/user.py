"""User management schemas."""

from typing import Annotated, Literal

from pydantic import Field

from app.schemas.auth import PHONE_PATTERN, RegisterIn, UserOut
from app.schemas.common import BaseIn, PageParams

Role = Literal["ADMIN", "CUSTOMER"]


class UserCreate(RegisterIn):
    """Admin-created user; role may be supplied."""

    role: Role = "CUSTOMER"


class UserUpdate(BaseIn):
    """Partial update of name, phone and role."""

    full_name: Annotated[str | None, Field(min_length=2, max_length=150)] = None
    phone: Annotated[str | None, Field(pattern=PHONE_PATTERN)] = None
    role: Role | None = None


class UserStatusIn(BaseIn):
    """Enable or disable an account."""

    is_active: bool


class UserListOut(UserOut):
    """User row in the admin list."""

    pass


__all__ = [
    "PageParams",
    "RegisterIn",
    "Role",
    "UserCreate",
    "UserListOut",
    "UserOut",
    "UserStatusIn",
    "UserUpdate",
]
