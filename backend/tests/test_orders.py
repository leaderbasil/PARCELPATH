"""Order creation, inventory and lifecycle tests."""

from fastapi.testclient import TestClient

from tests.conftest import advance_to, create_order, order_payload


def test_create_order_calculates_totals_and_deducts_stock(
    client: TestClient,
    customer_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"], 2)
    assert order["status"] == "PENDING"
    assert order["payment_status"] == "UNPAID"
    assert order["subtotal"] == "20.00"
    assert order["shipping_fee"] == "0.00"
    assert order["total_amount"] == "20.00"
    assert order["items"][0]["unit_price"] == "10.00"
    assert order["order_number"].startswith("ORD-")

    product = client.get(f"/api/v1/products/{sample_products[0]['id']}").json()["data"]
    assert product["in_stock"] is True
    admin_product = client.get(
        f"/api/v1/products/{sample_products[0]['id']}",
        headers={"Authorization": "Bearer fake"},
    )
    assert admin_product.status_code == 200  # invalid token on public route -> guest


def test_idempotency_returns_original_order(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    first = create_order(
        client, customer_headers, sample_products[0]["id"], key="idem-key-0001"
    )
    response = client.post(
        "/api/v1/orders",
        headers={**customer_headers, "Idempotency-Key": "idem-key-0001"},
        json=order_payload(sample_products[1]["id"], 3),
    )
    assert response.status_code == 200
    assert response.json()["data"]["id"] == first["id"]


def test_idempotency_key_of_another_user(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    create_order(client, customer_headers, sample_products[0]["id"], key="foreign-key-01")
    # The admin cannot create orders, so use a second customer token.
    second = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Other Customer",
            "email": "other@test.local",
            "password": "password123",
        },
    )
    assert second.status_code == 201
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "other@test.local", "password": "password123"},
    ).json()["data"]["access_token"]
    response = client.post(
        "/api/v1/orders",
        headers={
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": "foreign-key-01",
        },
        json=order_payload(sample_products[1]["id"]),
    )
    assert response.status_code == 409
    assert response.json()["code"] == "IDEMPOTENCY_KEY_CONFLICT"


def test_missing_idempotency_key(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    response = client.post(
        "/api/v1/orders",
        headers=customer_headers,
        json=order_payload(sample_products[0]["id"]),
    )
    assert response.status_code == 422


def test_insufficient_stock_lists_all_failures(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    response = client.post(
        "/api/v1/orders",
        headers={**customer_headers, "Idempotency-Key": "insufficient-key-01"},
        json={
            "items": [
                {"product_id": sample_products[0]["id"], "quantity": 99},
                {"product_id": sample_products[1]["id"], "quantity": 99},
            ],
            "payment_method": "COD",
            "shipping": order_payload(sample_products[0]["id"])["shipping"],
        },
    )
    assert response.status_code == 409
    assert response.json()["code"] == "INSUFFICIENT_STOCK"
    assert len(response.json()["meta"]["items"]) == 2


def test_rejects_client_supplied_prices(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    payload = order_payload(sample_products[0]["id"])
    payload["unit_price"] = "0.01"
    response = client.post(
        "/api/v1/orders",
        headers={**customer_headers, "Idempotency-Key": "tamper-key-0001"},
        json=payload,
    )
    assert response.status_code == 422


def test_merges_duplicate_product_ids(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    payload = order_payload(sample_products[0]["id"], 2)
    payload["items"].append({"product_id": sample_products[0]["id"], "quantity": 3})
    response = client.post(
        "/api/v1/orders",
        headers={**customer_headers, "Idempotency-Key": "merge-key-00001"},
        json=payload,
    )
    assert response.status_code == 201
    assert len(response.json()["data"]["items"]) == 1
    assert response.json()["data"]["items"][0]["quantity"] == 5
    assert response.json()["data"]["total_amount"] == "50.00"


def test_status_transitions_strict(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])

    illegal = client.patch(
        f"/api/v1/orders/{order['id']}/status",
        headers=admin_headers,
        json={"status": "DELIVERED"},
    )
    assert illegal.status_code == 409
    assert illegal.json()["code"] == "INVALID_STATUS_TRANSITION"

    for status in ("CONFIRMED", "PACKED"):
        response = client.patch(
            f"/api/v1/orders/{order['id']}/status",
            headers=admin_headers,
            json={"status": status},
        )
        assert response.status_code == 200
    assert client.get(
        f"/api/v1/orders/{order['id']}", headers=admin_headers
    ).json()["data"]["status"] == "PACKED"


def test_shipping_requires_tracking_number(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])
    advance_to(client, admin_headers, order["id"], "PACKED")
    response = client.post(
        f"/api/v1/orders/{order['id']}/ship",
        headers=admin_headers,
        json={"carrier": "Aramex"},
    )
    assert response.status_code == 422


def test_duplicate_tracking_number_rejected(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    first = create_order(
        client, customer_headers, sample_products[0]["id"], key="track-key-00001"
    )
    advance_to(client, admin_headers, first["id"], "PACKED")
    assert client.post(
        f"/api/v1/orders/{first['id']}/ship",
        headers=admin_headers,
        json={"carrier": "Aramex", "tracking_number": "TRACK-UNIQUE-1"},
    ).status_code == 200

    second = create_order(
        client, customer_headers, sample_products[0]["id"], key="track-key-00002"
    )
    advance_to(client, admin_headers, second["id"], "PACKED")
    response = client.post(
        f"/api/v1/orders/{second['id']}/ship",
        headers=admin_headers,
        json={"carrier": "Aramex", "tracking_number": "TRACK-UNIQUE-1"},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_TRACKING_NUMBER"


def test_cod_becomes_paid_on_delivery(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])
    advance_to(client, admin_headers, order["id"], "DELIVERED")
    detail = client.get(
        f"/api/v1/orders/{order['id']}", headers=admin_headers
    ).json()["data"]
    assert detail["status"] == "DELIVERED"
    assert detail["payment_status"] == "PAID"


def test_customer_cannot_see_another_customers_order(
    client: TestClient,
    customer_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Stranger",
            "email": "stranger@test.local",
            "password": "password123",
        },
    )
    token = client.post(
        "/api/v1/auth/login",
        json={"email": "stranger@test.local", "password": "password123"},
    ).json()["data"]["access_token"]
    response = client.get(
        f"/api/v1/orders/{order['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
    assert response.json()["code"] == "ORDER_NOT_FOUND"


def test_empty_cart_and_invalid_key(
    client: TestClient, customer_headers: dict[str, str], sample_products: list[dict]
) -> None:
    response = client.post(
        "/api/v1/orders",
        headers={**customer_headers, "Idempotency-Key": "empty-key-00001"},
        json={
            "items": [],
            "payment_method": "COD",
            "shipping": order_payload(sample_products[0]["id"])["shipping"],
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "EMPTY_CART"
