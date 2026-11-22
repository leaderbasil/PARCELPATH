"""Tracking timeline and shipping-correction tests."""

from fastapi.testclient import TestClient

from tests.conftest import advance_to, create_order


def test_tracking_events_are_chronological_and_hide_actor(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])
    advance_to(client, admin_headers, order["id"], "SHIPPED")

    response = client.get(
        f"/api/v1/orders/{order['id']}/tracking", headers=customer_headers
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "SHIPPED"
    assert [event["status"] for event in data["events"]] == [
        "PENDING",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
    ]
    assert all("by" not in event for event in data["events"])
    assert data["carrier"] == "Test Carrier"


def test_shipping_correction_state_rules(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])

    too_early = client.patch(
        f"/api/v1/orders/{order['id']}/shipping",
        headers=admin_headers,
        json={"tracking_number": "NEW-TRACK-1"},
    )
    assert too_early.status_code == 409
    assert too_early.json()["code"] == "SHIPPING_NOT_EDITABLE"

    advance_to(client, admin_headers, order["id"], "SHIPPED")
    original_events = client.get(
        f"/api/v1/orders/{order['id']}/tracking", headers=admin_headers
    ).json()["data"]["events"]

    response = client.patch(
        f"/api/v1/orders/{order['id']}/shipping",
        headers=admin_headers,
        json={"tracking_number": "CORRECTED-TRACK-1"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "SHIPPED"
    assert response.json()["data"]["tracking_number"] == "CORRECTED-TRACK-1"

    events = client.get(
        f"/api/v1/orders/{order['id']}/tracking", headers=admin_headers
    ).json()["data"]["events"]
    assert len(events) == len(original_events) + 1
    assert "updated" in events[-1]["note"]


def test_shipping_correction_requires_a_field(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    order = create_order(client, customer_headers, sample_products[0]["id"])
    advance_to(client, admin_headers, order["id"], "SHIPPED")
    response = client.patch(
        f"/api/v1/orders/{order['id']}/shipping",
        headers=admin_headers,
        json={"note": "nothing to change"},
    )
    assert response.status_code == 422
