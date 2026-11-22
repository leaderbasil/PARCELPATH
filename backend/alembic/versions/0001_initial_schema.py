"""Create the initial four-table schema.

Revision ID: 0001_initial
Revises: None
Create Date: 2026-11-22
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create enum, sequence, four tables, constraints and indexes."""
    op.execute("CREATE TYPE user_role AS ENUM ('ADMIN', 'CUSTOMER')")
    op.execute("CREATE SEQUENCE order_number_seq START 1")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM("ADMIN", "CUSTOMER", name="user_role", create_type=False),
            nullable=False,
            server_default="CUSTOMER",
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("sku", sa.String(64), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("stock_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("price >= 0", name="ck_products_price_nonneg"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_products_stock_nonneg"),
    )

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(30), nullable=False, unique=True),
        sa.Column(
            "customer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "status", sa.String(20), nullable=False, server_default="PENDING"
        ),
        sa.Column("payment_method", sa.String(10), nullable=False),
        sa.Column(
            "payment_status", sa.String(10), nullable=False, server_default="UNPAID"
        ),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "shipping_fee", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("shipping_name", sa.String(150), nullable=False),
        sa.Column("shipping_phone", sa.String(30), nullable=False),
        sa.Column("shipping_city", sa.String(100), nullable=False),
        sa.Column("shipping_address", sa.String(300), nullable=False),
        sa.Column("carrier", sa.String(100), nullable=True),
        sa.Column("tracking_number", sa.String(100), nullable=True, unique=True),
        sa.Column(
            "tracking_events",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("idempotency_key", sa.String(100), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "status IN ('PENDING','CONFIRMED','PACKED','SHIPPED',"
            "'OUT_FOR_DELIVERY','DELIVERED','CANCELLED')",
            name="ck_orders_status",
        ),
        sa.CheckConstraint(
            "payment_method IN ('COD','CARD')", name="ck_orders_payment_method"
        ),
        sa.CheckConstraint(
            "payment_status IN ('UNPAID','PAID')", name="ck_orders_payment_status"
        ),
        sa.CheckConstraint(
            "subtotal >= 0 AND shipping_fee >= 0 AND total_amount >= 0",
            name="ck_orders_amounts_nonneg",
        ),
        sa.CheckConstraint(
            "total_amount = subtotal + shipping_fee", name="ck_orders_total_formula"
        ),
        sa.CheckConstraint(
            "status NOT IN ('SHIPPED','OUT_FOR_DELIVERY','DELIVERED') "
            "OR tracking_number IS NOT NULL",
            name="ck_orders_tracking_required",
        ),
    )

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "order_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("orders.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("products.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("product_name", sa.String(200), nullable=False),
        sa.Column("sku", sa.String(64), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_items_qty_pos"),
        sa.CheckConstraint("unit_price >= 0", name="ck_items_price_nonneg"),
        sa.CheckConstraint(
            "line_total = quantity * unit_price", name="ck_items_line_formula"
        ),
    )

    op.create_index("ix_products_name", "products", ["name"])
    op.create_index("ix_products_category", "products", ["category"])
    op.create_index(
        "ix_orders_customer_created", "orders", ["customer_id", "created_at"]
    )
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_created_at", "orders", ["created_at"])
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])


def downgrade() -> None:
    """Drop all schema objects created by upgrade."""
    op.drop_index("ix_order_items_product_id", table_name="order_items")
    op.drop_index("ix_order_items_order_id", table_name="order_items")
    op.drop_index("ix_orders_created_at", table_name="orders")
    op.drop_index("ix_orders_status", table_name="orders")
    op.drop_index("ix_orders_customer_created", table_name="orders")
    op.drop_index("ix_products_category", table_name="products")
    op.drop_index("ix_products_name", table_name="products")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("products")
    op.drop_table("users")
    op.execute("DROP SEQUENCE order_number_seq")
    op.execute("DROP TYPE user_role")
