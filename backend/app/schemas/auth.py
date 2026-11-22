"""Authentication schemas."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import BaseIn, BaseOut

PHONE_PATTERN = r"^\+?[0-9]{7,15}$"


class RegisterIn(BaseIn):
    """Customer self-registration; a role field is rejected."""

    full_name: Annotated[str, Field(min_length=2, max_length=150)]
    email: EmailStr = Field(max_length=255)
    password: Annotated[str, Field(min_length=8, max_length=72)]
    phone: Annotated[str | None, Field(pattern=PHONE_PATTERN)] = None

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        """Store and compare emails case-insensitively."""
        return value.lower()

    @field_validator("password")
    @classmethod
    def check_password_bytes(cls, value: str) -> str:
        """bcrypt silently truncates beyond 72 bytes."""
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return value


class LoginIn(BaseIn):
    """Login credentials."""

    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: str) -> str:
        """Normalize email for lookup."""
        return value.lower()


class UserOut(BaseOut):
    """Public user representation (never includes password_hash)."""

    id: UUID
    full_name: str
    email: str
    phone: str | None = None
    role: str
    is_active: bool
    created_at: datetime


class TokenOut(BaseOut):
    """Login response."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut
