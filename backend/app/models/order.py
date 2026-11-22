"""Order model: customer order, shipping snapshot and tracking timeline."""

from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.product import MONEY
from app.utils.status_machine import ALL_STATUSES

STATUSES_SQL = ", ".join(f"'{status}'" for status in sorted(ALL_STATUSES))


class Order(Base):
    """Order model: customer order, shipping snapshot and tracking timeline."""

    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(f"status IN ({STATUSES_SQL})", name="ck_orders_status"),
        CheckConstraint(
            "payment_method IN ('COD','CARD')", name="ck_orders_payment_method"
        ),
        CheckConstraint(
            "payment_status IN ('UNPAID','PAID')", name="ck_orders_payment_status"
        ),
        CheckConstraint(
            "subtotal >= 0 AND shipping_fee >= 0 AND total_amount >= 0",
            name="ck_orders_amounts_nonneg",
        ),
        CheckConstraint(
            "total_amount = subtotal + shipping_fee", name="ck_orders_total_formula"
        ),
        CheckConstraint(
            "status NOT IN ('SHIPPED','OUT_FOR_DELIVERY','DELIVERED') "
            "OR tracking_number IS NOT NULL",
            name="ck_orders_tracking_required",
        ),
        Index("ix_orders_customer_created", "customer_id", "created_at"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    order_number: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="PENDING", server_default="PENDING"
    )
    payment_method: Mapped[str] = mapped_column(String(10), nullable=False)
    payment_status: Mapped[str] = mapped_column(
        String(10), nullable=False, default="UNPAID", server_default="UNPAID"
    )
    subtotal: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    shipping_fee: Mapped[Decimal] = mapped_column(
        MONEY, nullable=False, default=Decimal("0.00"), server_default="0"
    )
    total_amount: Mapped[Decimal] = mapped_column(MONEY, nullable=False)
    shipping_name: Mapped[str] = mapped_column(String(150), nullable=False)
    shipping_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    shipping_city: Mapped[str] = mapped_column(String(100), nullable=False)
    shipping_address: Mapped[str] = mapped_column(String(300), nullable=False)
    carrier: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tracking_number: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True
    )
    tracking_events: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    shipped_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    customer: Mapped[User] = relationship("User", back_populates="orders")  # noqa: F821
    items: Mapped[list[OrderItem]] = relationship(  # noqa: F821
        "OrderItem", back_populates="order"
    )

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, order_number={self.order_number}, status={self.status})>"
