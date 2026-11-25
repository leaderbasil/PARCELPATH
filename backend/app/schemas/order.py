"""Order, shipment and tracking schemas."""

from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import ConfigDict, Field, field_validator, model_validator

from app.schemas.auth import PHONE_PATTERN
from app.schemas.common import BaseIn, BaseOut, Money, PageParams

OrderStatus = Literal[
    "PENDING",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
]
PaymentMethod = Literal["COD", "CARD"]
PaymentStatus = Literal["UNPAID", "PAID"]


class OrderItemIn(BaseIn):
    """One cart line; prices are never accepted from the client."""

    product_id: UUID
    quantity: Annotated[int, Field(ge=1, le=99)]


class ShippingInfoIn(BaseIn):
    """Shipping address snapshot supplied at checkout."""

    name: Annotated[str, Field(min_length=2, max_length=150)]
    phone: Annotated[str, Field(pattern=PHONE_PATTERN)]
    city: Annotated[str, Field(min_length=2, max_length=100)]
    address: Annotated[str, Field(min_length=5, max_length=300)]


class OrderCreate(BaseIn):
    """Order creation payload."""

    # Emptiness is reported as EMPTY_CART by the service (Section 21.3).
    items: Annotated[list[OrderItemIn], Field(max_length=50)]
    payment_method: PaymentMethod
    shipping: ShippingInfoIn


class OrderStatusIn(BaseIn):
    """Status transitions allowed through PATCH /status."""

    status: Literal["CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"]
    note: Annotated[str | None, Field(max_length=500)] = None


class OrderShipIn(BaseIn):
    """Shipment details required to move PACKED -> SHIPPED."""

    carrier: Annotated[str, Field(min_length=1, max_length=100)]
    tracking_number: Annotated[str, Field(min_length=1, max_length=100)]
    note: Annotated[str | None, Field(max_length=500)] = None

    @field_validator("tracking_number")
    @classmethod
    def no_internal_spaces(cls, value: str) -> str:
        """Tracking numbers are opaque tokens without whitespace."""
        if any(char.isspace() for char in value):
            raise ValueError("tracking_number must not contain whitespace")
        return value


class ShippingUpdateIn(BaseIn):
    """Partial correction of shipment details."""

    carrier: Annotated[str | None, Field(min_length=1, max_length=100)] = None
    tracking_number: Annotated[str | None, Field(min_length=1, max_length=100)] = None
    note: Annotated[str | None, Field(max_length=500)] = None

    @model_validator(mode="after")
    def at_least_one_field(self) -> ShippingUpdateIn:
        """Require at least one of carrier / tracking_number."""
        if self.carrier is None and self.tracking_number is None:
            raise ValueError("carrier or tracking_number is required")
        return self

    @field_validator("tracking_number")
    @classmethod
    def no_internal_spaces(cls, value: str | None) -> str | None:
        """Tracking numbers are opaque tokens without whitespace."""
        if value and any(char.isspace() for char in value):
            raise ValueError("tracking_number must not contain whitespace")
        return value


class OrderItemOut(BaseOut):
    """Snapshot line returned with an order."""

    product_id: UUID
    product_name: str
    sku: str
    quantity: int
    unit_price: Money
    line_total: Money


class ShippingOut(BaseOut):
    """Shipping address returned as a nested object."""

    name: str
    phone: str
    city: str
    address: str


class CustomerBriefOut(BaseOut):
    """Customer summary embedded in admin responses."""

    id: UUID
    full_name: str
    email: str
    phone: str | None = None


class OrderOut(BaseOut):
    """Full order representation (Section 9.4)."""

    id: UUID
    order_number: str
    status: OrderStatus
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    subtotal: Money
    shipping_fee: Money
    total_amount: Money
    shipping: ShippingOut
    carrier: str | None = None
    tracking_number: str | None = None
    created_at: datetime
    items: list[OrderItemOut]
    customer: CustomerBriefOut | None = None


class OrderListItem(BaseOut):
    """Compact order row."""

    id: UUID
    order_number: str
    status: OrderStatus
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    total_amount: Money
    items_count: int
    created_at: datetime
    customer: CustomerBriefOut | None = None


class TrackingEventOut(BaseOut):
    """Public tracking event; `by` is never exposed."""

    status: OrderStatus
    note: str | None = None
    at: datetime


class TrackingOut(BaseOut):
    """Tracking response."""

    order_number: str
    status: OrderStatus
    carrier: str | None = None
    tracking_number: str | None = None
    events: list[TrackingEventOut]


class OrderListParams(PageParams):
    """Order listing filters."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    status: OrderStatus | None = None
    from_: Annotated[date | None, Field(alias="from")] = None
    to: date | None = None
    order_number: Annotated[str | None, Field(max_length=30)] = None
    customer_id: UUID | None = None
