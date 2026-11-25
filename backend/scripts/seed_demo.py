"""Idempotent demo data: admin, customers, 15 products and 8 orders."""

import logging
from decimal import Decimal

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.order import (
    OrderCreate,
    OrderItemIn,
    OrderShipIn,
    OrderStatusIn,
    ShippingInfoIn,
)
from app.services import order_service
from app.services.product_service import create_product

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEMO_PASSWORD = "Customer123!"
CUSTOMERS = [
    ("demo.customer1@example.com", "Demo Customer One"),
    ("demo.customer2@example.com", "Demo Customer Two"),
]

PRODUCTS = [
    ("Laptop Pro 15", "ELEC-001", "Electronics", Decimal("999.00"), 12),
    ("Wireless Mouse", "ELEC-002", "Electronics", Decimal("25.50"), 40),
    ("Mechanical Keyboard", "ELEC-003", "Electronics", Decimal("79.00"), 18),
    ("USB-C Hub", "ELEC-004", "Electronics", Decimal("34.00"), 3),
    ("Monitor Stand", "ELEC-005", "Electronics", Decimal("45.00"), 0),
    ("Cotton T-Shirt", "FASH-001", "Fashion", Decimal("18.00"), 60),
    ("Denim Jacket", "FASH-002", "Fashion", Decimal("65.00"), 22),
    ("Running Shoes", "FASH-003", "Fashion", Decimal("85.00"), 4),
    ("Leather Belt", "FASH-004", "Fashion", Decimal("22.00"), 30),
    ("Ceramic Mug", "HOME-001", "Home", Decimal("12.50"), 50),
    ("Desk Lamp", "HOME-002", "Home", Decimal("39.00"), 15),
    ("Notebook Set", "HOME-003", "Home", Decimal("9.50"), 80),
    ("Yoga Mat", "SPORT-001", "Sports", Decimal("29.00"), 27),
    ("Water Bottle", "SPORT-002", "Sports", Decimal("16.00"), 5),
    ("Trail Backpack", "SPORT-003", "Sports", Decimal("72.00"), 11, False),
]


def _ensure_customers(db) -> list[User]:
    """Create the two demo customers once."""
    users: list[User] = []
    for email, full_name in CUSTOMERS:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                full_name=full_name,
                email=email,
                phone="+962790000001",
                password_hash=hash_password(DEMO_PASSWORD),
                role=UserRole.CUSTOMER,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        users.append(user)
    return users


def _ensure_products(db) -> list[Product]:
    """Create the fifteen demo products once and return them by SKU order."""
    products: list[Product] = []
    for entry in PRODUCTS:
        name, sku, category, price, stock = entry[:5]
        is_active = entry[5] if len(entry) > 5 else True
        product = db.scalar(select(Product).where(Product.sku == sku))
        if product is None:
            from app.schemas.product import ProductCreate

            product = create_product(
                db,
                ProductCreate(
                    name=name,
                    sku=sku,
                    category=category,
                    description=f"Demo product: {name}",
                    price=price,
                    stock_quantity=stock,
                    image_url=None,
                    is_active=is_active,
                ),
            )
        products.append(product)
    return products


def _payload(product: Product, quantity: int = 1) -> OrderCreate:
    return OrderCreate(
        items=[OrderItemIn(product_id=product.id, quantity=quantity)],
        payment_method="COD",
        shipping=ShippingInfoIn(
            name="Demo Customer",
            phone="+962790000001",
            city="Amman",
            address="Demo Street, Building 1, Apartment 2",
        ),
    )


def _advance(db, admin: User, order, target: str) -> None:
    """Walk the state machine up to the requested status."""
    path = {
        "PENDING": [],
        "CONFIRMED": ["CONFIRMED"],
        "PACKED": ["CONFIRMED", "PACKED"],
        "SHIPPED": ["CONFIRMED", "PACKED"],
        "OUT_FOR_DELIVERY": ["CONFIRMED", "PACKED"],
        "DELIVERED": ["CONFIRMED", "PACKED"],
        "CANCELLED": [],
    }[target]
    for status in path:
        order = order_service.change_status(db, admin, order.id, OrderStatusIn(status=status))

    if target in {"SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"}:
        index = {"SHIPPED": 0, "OUT_FOR_DELIVERY": 1, "DELIVERED": 2}[target]
        order = order_service.ship_order(
            db,
            admin,
            order.id,
            OrderShipIn(carrier="Demo Carrier", tracking_number=f"DEMO-TRACK-{index}-{order.id.hex[:8]}"),
        )
        if index >= 1:
            order = order_service.change_status(
                db, admin, order.id, OrderStatusIn(status="OUT_FOR_DELIVERY")
            )
        if index >= 2:
            order_service.change_status(
                db, admin, order.id, OrderStatusIn(status="DELIVERED")
            )
    elif target == "CANCELLED":
        order_service.cancel_order(db, admin, order.id)


def seed() -> None:
    """Populate demo data if it is not already present."""
    init_db()
    db = SessionLocal()
    try:
        customers = _ensure_customers(db)
        products = _ensure_products(db)
        admin = db.scalar(select(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True)))
        if admin is None:
            raise RuntimeError("First admin was not created")

        targets = [
            "PENDING",
            "CONFIRMED",
            "PACKED",
            "SHIPPED",
            "OUT_FOR_DELIVERY",
            "DELIVERED",
            "DELIVERED",
            "CANCELLED",
        ]
        for index, target in enumerate(targets, start=1):
            key = f"demo-order-{index:04d}"
            from app.models.order import Order

            existing = db.scalar(select(Order.id).where(Order.idempotency_key == key))
            if existing is not None:
                continue
            customer = customers[index % len(customers)]
            needed = 1 + index % 2
            product = next((p for p in products if p.stock_quantity >= needed), None)
            if product is None:
                raise RuntimeError("Not enough stock to seed demo orders")
            order, _ = order_service.create_order(db, customer, _payload(product, needed), key)
            _advance(db, admin, order, target)
            logger.info("Seeded demo order %s (%s)", order.order_number, target)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
