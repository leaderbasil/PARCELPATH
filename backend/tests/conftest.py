"""Shared pytest fixtures running against a real PostgreSQL test database."""

from collections.abc import Generator
from decimal import Decimal
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

import app.models.order  # noqa: F401
import app.models.order_item  # noqa: F401
import app.models.product  # noqa: F401
import app.models.user  # noqa: F401
from app.core.config import settings
from app.db.session import get_db
from app.main import app

BACKEND_DIR = Path(__file__).resolve().parents[1]

test_engine = create_engine(settings.TEST_DATABASE_URL, pool_pre_ping=True)
TestSession = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="session", autouse=True)
def setup_database() -> Generator[None, None, None]:
    """Build the test schema with the same Alembic migration used in production."""
    with test_engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))

    alembic_config = Config(str(BACKEND_DIR / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    original_url = settings.DATABASE_URL
    settings.DATABASE_URL = settings.TEST_DATABASE_URL
    try:
        command.upgrade(alembic_config, "head")
    finally:
        settings.DATABASE_URL = original_url

    yield
    test_engine.dispose()


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Yield a test database session."""
    session = TestSession()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def override_db(db: Session) -> Generator[None, None, None]:
    """Inject the test session into the application."""

    def _override() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()
    with test_engine.begin() as connection:
        connection.execute(
            text(
                "TRUNCATE TABLE order_items, orders, products, users "
                "RESTART IDENTITY CASCADE"
            )
        )
        connection.execute(text("ALTER SEQUENCE order_number_seq RESTART WITH 1"))


@pytest.fixture
def client() -> TestClient:
    """HTTP client for the FastAPI application."""
    return TestClient(app)


def _token(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        "/api/v1/auth/register",
        json={"full_name": "Test User", "email": email, "password": password},
    )
    assert response.status_code == 201, response.text
    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.text
    return response.json()["data"]["access_token"]


@pytest.fixture
def customer_token(client: TestClient) -> str:
    """Access token for a customer."""
    return _token(client, "customer@test.local", "Customer123!")


@pytest.fixture
def customer_headers(customer_token: str) -> dict[str, str]:
    """Authorization headers for a customer."""
    return {"Authorization": f"Bearer {customer_token}"}


@pytest.fixture
def admin_token(client: TestClient, db: Session) -> str:
    """Promote the first registered user to admin and return its token."""
    token = _token(client, "admin@test.local", "Admin123!")
    from app.models.user import User, UserRole

    admin = db.query(User).filter(User.email == "admin@test.local").one()
    admin.role = UserRole.ADMIN
    db.commit()
    return token


@pytest.fixture
def admin_headers(admin_token: str) -> dict[str, str]:
    """Authorization headers for an admin."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sample_products(client: TestClient, admin_headers: dict[str, str]) -> list[dict]:
    """Create three active products for order tests."""
    created = []
    for index in range(3):
        response = client.post(
            "/api/v1/products",
            headers=admin_headers,
            json={
                "name": f"Product {index}",
                "sku": f"TEST-{index:03d}",
                "price": f"{10 + index}.00",
                "stock_quantity": 10,
            },
        )
        assert response.status_code == 201, response.text
        created.append(response.json()["data"])
    return created


def order_payload(product_id: str, quantity: int = 1) -> dict:
    """Build a valid order creation body."""
    return {
        "items": [{"product_id": product_id, "quantity": quantity}],
        "payment_method": "COD",
        "shipping": {
            "name": "Test Customer",
            "phone": "+962790000000",
            "city": "Amman",
            "address": "Test Street, Building 1",
        },
    }


def create_order(client: TestClient, headers: dict[str, str], product_id: str,
                 key: str = "integration-key-001", quantity: int = 1) -> dict:
    """Create an order through the API."""
    response = client.post(
        "/api/v1/orders",
        headers={**headers, "Idempotency-Key": key},
        json=order_payload(product_id, quantity),
    )
    assert response.status_code == 201, response.text
    return response.json()["data"]


def advance_to(client: TestClient, admin_headers: dict[str, str], order_id: str,
               target: str) -> None:
    """Move an order through the state machine to the requested status."""
    sequence = {
        "PENDING": [],
        "CONFIRMED": ["CONFIRMED"],
        "PACKED": ["CONFIRMED", "PACKED"],
        "SHIPPED": ["CONFIRMED", "PACKED"],
        "OUT_FOR_DELIVERY": ["CONFIRMED", "PACKED"],
        "DELIVERED": ["CONFIRMED", "PACKED"],
    }[target]
    for status in sequence:
        response = client.patch(
            f"/api/v1/orders/{order_id}/status",
            headers=admin_headers,
            json={"status": status},
        )
        assert response.status_code == 200, response.text
    if target in {"SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"}:
        response = client.post(
            f"/api/v1/orders/{order_id}/ship",
            headers=admin_headers,
            json={
                "carrier": "Test Carrier",
                "tracking_number": f"TRACK-{order_id}-{target}",
            },
        )
        assert response.status_code == 200, response.text
        if target in {"OUT_FOR_DELIVERY", "DELIVERED"}:
            response = client.patch(
                f"/api/v1/orders/{order_id}/status",
                headers=admin_headers,
                json={"status": "OUT_FOR_DELIVERY"},
            )
            assert response.status_code == 200, response.text
        if target == "DELIVERED":
            response = client.patch(
                f"/api/v1/orders/{order_id}/status",
                headers=admin_headers,
                json={"status": "DELIVERED"},
            )
            assert response.status_code == 200, response.text


__all__ = [
    "Decimal",
    "advance_to",
    "admin_headers",
    "admin_token",
    "client",
    "create_order",
    "customer_headers",
    "customer_token",
    "db",
    "order_payload",
    "sample_products",
]
