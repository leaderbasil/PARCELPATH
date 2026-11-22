"""Reusable pagination helpers for SQLAlchemy select statements."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

T = TypeVar("T")


class PageParams(BaseModel):
    """Validated page/page_size query parameters."""

    model_config = ConfigDict(extra="forbid")

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response body."""

    model_config = ConfigDict(from_attributes=True)

    items: list[T]
    total: int
    page: int
    page_size: int


def paginate(db: Session, statement: Select[Any], params: PageParams) -> tuple[list[Any], int]:
    """Execute a select with LIMIT/OFFSET and return rows plus the total count."""
    total = int(db.scalar(select(func.count()).select_from(statement.subquery())) or 0)
    rows = db.scalars(
        statement.offset((params.page - 1) * params.page_size).limit(params.page_size)
    ).all()
    return list(rows), total
