"""Common Pydantic schemas and the JSON money type."""

from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer, field_validator
from pydantic import condecimal

from app.utils.money import money_to_str
from app.utils.pagination import PageParams

__all__ = [
    "BaseIn",
    "BaseOut",
    "Envelope",
    "MessageOut",
    "Money",
    "MoneyAny",
    "Page",
    "PageEnvelope",
    "PageParams",
    "PaginationMeta",
    "UUIDOut",
    "make_envelope",
    "utcnow_iso",
]

# Money is always a two-decimal string in JSON (never a float).
Money = Annotated[
    condecimal(max_digits=12, decimal_places=2, ge=0),
    PlainSerializer(money_to_str, return_type=str, when_used="json"),
]

# Money used for values that may be negative in intermediate calculations.
MoneyAny = Annotated[
    condecimal(max_digits=12, decimal_places=2),
    PlainSerializer(money_to_str, return_type=str, when_used="json"),
]

T = TypeVar("T")


class BaseOut(BaseModel):
    """Base output schema with ORM attribute support."""

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class BaseIn(BaseModel):
    """Base input schema: strict, whitespace-trimmed."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("phone", mode="before", check_fields=False)
    @classmethod
    def normalize_phone(cls, value: str | None) -> str | None:
        """Drop spaces and dashes before validating the phone pattern."""
        if value is None:
            return None
        return value.replace(" ", "").replace("-", "")


class MessageOut(BaseModel):
    """Simple success message envelope."""

    message: str


class Envelope(BaseModel, Generic[T]):
    """Standard success envelope."""

    data: T
    message: str


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int = Field(ge=1, default=1)
    page_size: int = Field(ge=1, le=100, default=20)
    total: int


class Page(BaseModel, Generic[T]):
    """Paginated data payload."""

    items: list[T]
    total: int
    page: int
    page_size: int


class PageEnvelope(BaseModel, Generic[T]):
    """Paginated success envelope."""

    data: Page[T]
    message: str


class UUIDOut(BaseOut):
    """Minimal identifier output."""

    id: UUID


def utcnow_iso() -> str:
    """Return the current UTC time in ISO 8601 format."""
    from datetime import timezone

    return datetime.now(timezone.utc).isoformat()


def make_envelope(data: Any, message: str) -> dict[str, Any]:
    """Wrap data in the standard success envelope."""
    return {"data": data, "message": message}
