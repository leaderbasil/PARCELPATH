"""Product schemas."""

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, HttpUrl, field_validator

from app.schemas.common import BaseIn, BaseOut, Money, PageParams

Sku = Annotated[str, Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9._-]+$")]
ProductName = Annotated[str, Field(min_length=1, max_length=200)]
Stock = Annotated[int, Field(ge=0, le=1_000_000)]
SortOption = Literal["newest", "price_asc", "price_desc", "name"]


class ProductCreate(BaseIn):
    """Create a product."""

    name: ProductName
    sku: Sku
    description: Annotated[str | None, Field(max_length=5000)] = None
    category: Annotated[str | None, Field(max_length=100)] = None
    price: Money
    stock_quantity: Stock
    image_url: Annotated[HttpUrl | None, Field(max_length=500)] = None
    is_active: bool = True

    @field_validator("sku", "name", "category", mode="before")
    @classmethod
    def squeeze_optional(cls, value: str | None) -> str | None:
        """Collapse repeated whitespace and normalize empty strings to None."""
        if value is None:
            return None
        normalized = " ".join(str(value).split())
        return normalized or None


class ProductUpdate(BaseIn):
    """Partial product update."""

    name: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    sku: Annotated[str | None, Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9._-]+$")] = None
    description: Annotated[str | None, Field(max_length=5000)] = None
    category: Annotated[str | None, Field(max_length=100)] = None
    price: Money | None = None
    stock_quantity: Stock | None = None
    image_url: Annotated[HttpUrl | None, Field(max_length=500)] = None
    is_active: bool | None = None


class ProductPublicOut(BaseOut):
    """Public catalog representation: no stock quantity."""

    id: UUID
    name: str
    sku: str
    description: str | None = None
    category: str | None = None
    price: Money
    image_url: str | None = None
    in_stock: bool


class ProductAdminOut(ProductPublicOut):
    """Admin representation: includes inventory and lifecycle data."""

    stock_quantity: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductListParams(PageParams):
    """Catalog query parameters."""

    search: Annotated[str | None, Field(min_length=1, max_length=200)] = None
    category: Annotated[str | None, Field(max_length=100)] = None
    min_price: Money | None = None
    max_price: Money | None = None
    sort: SortOption = "newest"
    is_active: bool | None = None

    @field_validator("search")
    @classmethod
    def strip_search(cls, value: str | None) -> str | None:
        """Whitespace-only searches are treated as absent."""
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("max_price")
    @classmethod
    def price_range(cls, value: Money | None, info) -> Money | None:  # noqa: ANN001
        """Reject min_price > max_price with a 422."""
        min_price = info.data.get("min_price")
        if value is not None and min_price is not None and min_price > value:
            raise ValueError("min_price must not exceed max_price")
        return value
