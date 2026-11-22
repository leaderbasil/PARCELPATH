"""Inventory reservation, rollback and cancellation tests."""

from fastapi.testclient import TestClient

from tests.conftest import advance_to, create_order, order_payload


def test_customer_cancel_restores_stock_once(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    product_id = sample_products[0]["id"]
    order = create_order(client, customer_headers, product_id, 3)
    admin_headers = {
        "Authorization": "Bearer "
        + client.post(
            "/api/v1/auth/login",
            json={"email": "admin@test.local", "password": "Admin123!"},
        ).json()["data"]["access_token"]
    }
    before = client.get(
        f"/api/v1/products/{product_id}", headers=admin_headers
    ).json()["data"]["stock_quantity"]
    assert before == 7

    assert client.post(
        f"/api/v1/orders/{order['id']}/cancel", headers=customer_headers
    ).status_code == 200
    after = client.get(
        f"/api/v1/products/{product_id}", headers=admin_headers
    ).json()["data"]["stock_quantity"]
    assert after == 10

    second = client.post(
        f"/api/v1/orders/{order['id']}/cancel", headers=customer_headers
    )
    assert second.status_code == 409
    assert second.json()["code"] == "ORDER_ALREADY_CANCELLED"
    assert client.get(
        f"/api/v1/products/{product_id}", headers=admin_headers
    ).json()["data"]["stock_quantity"] == 10


def test_admin_cancel_until_packed(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])
    advance_to(client, admin_headers, order["id"], "PACKED")
    assert client.post(
        f"/api/v1/orders/{order['id']}/cancel", headers=admin_headers
    ).status_code == 200


def test_cancel_after_shipped_rejected_even_for_admin(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])
    advance_to(client, admin_headers, order["id"], "SHIPPED")
    response = client.post(
        f"/api/v1/orders/{order['id']}/cancel", headers=admin_headers
    )
    assert response.status_code == 409
    assert response.json()["code"] == "ORDER_NOT_CANCELLABLE"


def test_cancelled_card_order_stays_paid(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    payload = order_payload(sample_products[0]["id"])
    payload["payment_method"] = "CARD"
    response = client.post(
        "/api/v1/orders",
        headers={**customer_headers, "Idempotency-Key": "card-cancel-key-01"},
        json=payload,
    )
    assert response.status_code == 201
    assert response.json()["data"]["payment_status"] == "PAID"
    order = response.json()["data"]
    client.post(f"/api/v1/orders/{order['id']}/cancel", headers=customer_headers)
    detail = client.get(
        f"/api/v1/orders/{order['id']}", headers=customer_headers
    ).json()["data"]
    assert detail["status"] == "CANCELLED"
    assert detail["payment_status"] == "PAID"


def test_inactive_product_cannot_be_ordered(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    product_id = sample_products[0]["id"]
    assert client.delete(
        f"/api/v1/products/{product_id}", headers=admin_headers
    ).status_code == 204
    response = client.post(
        "/api/v1/orders",
        headers={**customer_headers, "Idempotency-Key": "inactive-key-0001"},
        json=order_payload(product_id),
    )
    assert response.status_code == 409
    assert response.json()["code"] == "PRODUCT_INACTIVE"
