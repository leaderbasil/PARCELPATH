"""Concurrency and failure-path tests from Section 21.9."""

from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.db.session import get_db
from app.main import app
from app.models.order import Order
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.order import (
    OrderCreate,
    OrderItemIn,
    OrderShipIn,
    OrderStatusIn,
    ShippingInfoIn,
)
from app.schemas.product import ProductUpdate
from app.services import order_service, product_service
from tests.conftest import TestSession


def _make_user(session: Session, email: str, role: UserRole = UserRole.CUSTOMER) -> User:
    user = User(
        full_name=email.split("@")[0],
        email=email,
        phone=None,
        password_hash="not-used",
        role=role,
        is_active=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_product(session: Session, stock: int = 10) -> Product:
    product = Product(
        name="Race Product",
        sku=f"RACE-{stock}-{abs(hash(session)) % 100000}",
        price=Decimal("10.00"),
        stock_quantity=stock,
        is_active=True,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def _payload(product_id: UUID, quantity: int = 1) -> OrderCreate:
    return OrderCreate(
        items=[OrderItemIn(product_id=product_id, quantity=quantity)],
        payment_method="COD",
        shipping=ShippingInfoIn(
            name="Race Customer",
            phone="+962790000000",
            city="Amman",
            address="Race Street, Building 1",
        ),
    )


def _multi_payload(items: list[tuple[UUID, int]]) -> OrderCreate:
    return OrderCreate(
        items=[OrderItemIn(product_id=product_id, quantity=quantity) for product_id, quantity in items],
        payment_method="COD",
        shipping=ShippingInfoIn(
            name="Race Customer",
            phone="+962790000000",
            city="Amman",
            address="Race Street, Building 1",
        ),
    )


def _create_in_thread(user_id: UUID, product_id: UUID, key: str, quantity: int = 1) -> bool:
    session = TestSession()
    try:
        user = session.get(User, user_id)
        if user is None:
            raise AssertionError("user vanished")
        order_service.create_order(session, user, _payload(product_id, quantity), key)
        return True
    except AppException as exc:
        if exc.code in {"IDEMPOTENCY_KEY_CONFLICT", "INSUFFICIENT_STOCK"}:
            return False
        raise
    finally:
        session.close()


def test_idempotency_concurrent_same_key() -> None:
    session = TestSession()
    user = _make_user(session, "race1@test.local")
    product = _make_product(session)
    user_id, product_id = user.id, product.id
    session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(
            pool.map(lambda _: _create_in_thread(user_id, product_id, "concurrent-key-01"), range(2))
        )
    assert results.count(True) == 1

    verification = TestSession()
    orders = verification.query(Order).filter(Order.idempotency_key == "concurrent-key-01").all()
    assert len(orders) == 1
    assert verification.get(Product, product_id).stock_quantity == 9
    verification.close()


def test_cancel_vs_confirm_race() -> None:
    setup = TestSession()
    customer = _make_user(setup, "race2c@test.local")
    admin = _make_user(setup, "race2a@test.local", UserRole.ADMIN)
    product = _make_product(setup)
    order, _ = order_service.create_order(
        setup, customer, _payload(product.id), "race2-order-key-01"
    )
    ids = (customer.id, admin.id, product.id, order.id)
    setup.close()

    def act(which: str) -> bool:
        session = TestSession()
        try:
            actor = session.get(User, ids[1] if which == "confirm" else ids[0])
            persisted = session.get(Order, ids[3])
            if actor is None or persisted is None:
                raise AssertionError("fixture vanished")
            if which == "confirm":
                order_service.change_status(
                    session, actor, persisted.id, OrderStatusIn(status="CONFIRMED")
                )
            else:
                order_service.cancel_order(session, actor, persisted.id)
            return True
        except AppException as exc:
            if exc.code in {"INVALID_STATUS_TRANSITION", "ORDER_NOT_CANCELLABLE"}:
                return False
            raise
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(act, ("cancel", "confirm")))
    assert outcomes.count(True) == 1

    verification = TestSession()
    final = verification.get(Order, ids[3])
    stock = verification.get(Product, ids[2]).stock_quantity
    verification.close()
    assert final.status == ("CANCELLED" if stock == 10 else "CONFIRMED")
    assert stock in {9, 10}


def test_stock_patch_vs_order_race() -> None:
    setup = TestSession()
    customer = _make_user(setup, "race3@test.local")
    product = _make_product(setup, stock=10)
    ids = (customer.id, product.id)
    setup.close()

    def set_stock() -> None:
        session = TestSession()
        try:
            product_service.update_product(session, ids[1], ProductUpdate(stock_quantity=5))
        finally:
            session.close()

    def place_order() -> bool:
        return _create_in_thread(ids[0], ids[1], "race3-order-key-01", quantity=8)

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(set_stock), pool.submit(place_order)]
        order_won = futures[1].result()
        futures[0].result()

    verification = TestSession()
    stock = verification.get(Product, ids[1]).stock_quantity
    orders = verification.query(Order).filter_by(idempotency_key="race3-order-key-01").all()
    verification.close()

    if order_won:
        # The order committed first (10 - 8 = 2), then admin set the absolute stock to 5.
        assert stock == 5
    else:
        assert not orders
        assert stock == 5


def test_ship_duplicate_tracking_race() -> None:
    setup = TestSession()
    customer = _make_user(setup, "race4c@test.local")
    admin = _make_user(setup, "race4a@test.local", UserRole.ADMIN)
    product = _make_product(setup, stock=20)
    first, _ = order_service.create_order(setup, customer, _payload(product.id), "race4-key-1")
    second, _ = order_service.create_order(setup, customer, _payload(product.id), "race4-key-2")
    for order in (first, second):
        order_service.change_status(
            setup, admin, order.id, OrderStatusIn(status="CONFIRMED")
        )
        order_service.change_status(setup, admin, order.id, OrderStatusIn(status="PACKED"))
    ids = (admin.id, first.id, second.id)
    setup.close()

    def ship(order_id: UUID) -> bool:
        session = TestSession()
        try:
            actor = session.get(User, ids[0])
            if actor is None:
                raise AssertionError("admin vanished")
            order_service.ship_order(
                session,
                actor,
                order_id,
                OrderShipIn(carrier="Race Carrier", tracking_number="RACE-SHARED-TRACK"),
            )
            return True
        except AppException as exc:
            if exc.code == "DUPLICATE_TRACKING_NUMBER":
                return False
            raise
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(ship, (ids[1], ids[2])))
    assert outcomes.count(True) == 1


def test_two_cancellations_same_product_race() -> None:
    setup = TestSession()
    customer = _make_user(setup, "race5@test.local")
    product = _make_product(setup, stock=10)
    first, _ = order_service.create_order(
        setup, customer, _payload(product.id, 2), "race5-key-1"
    )
    second, _ = order_service.create_order(
        setup, customer, _payload(product.id, 3), "race5-key-2"
    )
    ids = (customer.id, product.id, first.id, second.id)
    setup.close()

    def cancel(order_id: UUID) -> None:
        session = TestSession()
        try:
            actor = session.get(User, ids[0])
            if actor is None:
                raise AssertionError("customer vanished")
            order_service.cancel_order(session, actor, order_id)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(cancel, (ids[2], ids[3])))

    verification = TestSession()
    stock = verification.get(Product, ids[1]).stock_quantity
    statuses = [verification.get(Order, order_id).status for order_id in (ids[2], ids[3])]
    verification.close()
    assert statuses == ["CANCELLED", "CANCELLED"]
    assert stock == 10


def test_concurrent_last_unit_only_one_order_succeeds() -> None:
    setup = TestSession()
    customer = _make_user(setup, "race6@test.local")
    product = _make_product(setup, stock=1)
    ids = (customer.id, product.id)
    setup.close()

    def attempt(key: str) -> bool:
        return _create_in_thread(ids[0], ids[1], key)

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = list(pool.map(attempt, ("last-unit-key-1", "last-unit-key-2")))
    assert outcomes.count(True) == 1

    verification = TestSession()
    stock = verification.get(Product, ids[1]).stock_quantity
    orders = verification.query(Order).filter(Order.idempotency_key.like("last-unit-key-%")).all()
    verification.close()
    assert stock == 0
    assert len(orders) == 1


def test_concurrent_orders_reversed_product_order_no_deadlock() -> None:
    setup = TestSession()
    customer = _make_user(setup, "race7@test.local")
    first = _make_product(setup, stock=10)
    second = _make_product(setup, stock=10)
    ids = (customer.id, first.id, second.id)
    setup.close()

    def place(key: str, items: list[tuple[UUID, int]]) -> bool:
        session = TestSession()
        try:
            user = session.get(User, ids[0])
            if user is None:
                raise AssertionError("customer vanished")
            order_service.create_order(session, user, _multi_payload(items), key)
            return True
        except AppException:
            return False
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(place, "reversed-key-1", [(ids[1], 1), (ids[2], 2)]),
            pool.submit(place, "reversed-key-2", [(ids[2], 1), (ids[1], 2)]),
        ]
        outcomes = [future.result(timeout=30) for future in futures]
    assert outcomes == [True, True]

    verification = TestSession()
    assert verification.get(Product, ids[1]).stock_quantity == 7
    assert verification.get(Product, ids[2]).stock_quantity == 7
    verification.close()


def test_rollback_leaves_no_order_and_no_stock_change(monkeypatch) -> None:  # noqa: ANN001
    setup = TestSession()
    customer = _make_user(setup, "race8@test.local")
    product = _make_product(setup, stock=10)
    ids = (customer.id, product.id)
    setup.close()

    def fail_before_commit(_db: Session) -> str:
        raise RuntimeError("forced failure before commit")

    monkeypatch.setattr(order_service, "next_order_number", fail_before_commit)
    session = TestSession()
    user = session.get(User, ids[0])
    assert user is not None
    try:
        order_service.create_order(session, user, _payload(ids[1], 3), "rollback-key-001")
    except RuntimeError:
        pass
    else:  # pragma: no cover - the monkeypatch must fail
        raise AssertionError("expected the forced failure")
    finally:
        session.close()

    verification = TestSession()
    assert verification.get(Product, ids[1]).stock_quantity == 10
    assert verification.query(Order).filter_by(idempotency_key="rollback-key-001").count() == 0
    verification.close()


def test_health_endpoint_db_down_returns_503(
    client: TestClient, monkeypatch
) -> None:  # noqa: ANN001
    import app.main as main_module

    monkeypatch.setattr(main_module, "check_database_connection", lambda: False)
    response = client.get("/health")
    assert response.status_code == 503
    assert response.json() == {
        "detail": "Database unavailable",
        "code": "DATABASE_UNAVAILABLE",
    }


def test_health_endpoint_db_up(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_error_envelope_never_leaks_stack_trace(
    client: TestClient, monkeypatch
) -> None:  # noqa: ANN001
    def boom(_db):  # noqa: ANN001
        raise RuntimeError("secret internal detail")

    monkeypatch.setitem(app.dependency_overrides, get_db, boom)
    response = client.get("/api/v1/products")
    assert response.status_code == 500
    body = response.json()
    assert body["code"] == "INTERNAL_ERROR"
    assert "secret internal detail" not in body["detail"]
