"""Reporting tests: dashboard, sales and top products."""

from datetime import date

from fastapi.testclient import TestClient

from tests.conftest import advance_to, create_order


def _period_params() -> dict[str, str]:
    today = date.today()
    return {"from": today.isoformat(), "to": today.isoformat()}


def test_dashboard_aggregates_only_non_cancelled_sales(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    first = create_order(
        client, customer_headers, sample_products[0]["id"], key="report-key-00001", quantity=2
    )
    second = create_order(
        client, customer_headers, sample_products[1]["id"], key="report-key-00002"
    )
    advance_to(client, admin_headers, first["id"], "DELIVERED")
    client.post(f"/api/v1/orders/{second['id']}/cancel", headers=customer_headers)

    response = client.get(
        "/api/v1/reports/dashboard", headers=admin_headers, params=_period_params()
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["period"]["order_count"] == 1
    assert data["period"]["sales_total"] == "20.00"
    assert data["period"]["average_order"] == "20.00"
    assert data["orders_by_status"]["DELIVERED"] == 1
    assert data["orders_by_status"]["CANCELLED"] == 1
    assert data["pending_count"] == 0
    assert data["top_products"][0]["product_name"] == "Product 0"
    assert data["top_products"][0]["quantity_sold"] == 2
    assert data["daily_sales"][0]["total"] == "20.00"


def test_sales_report_groups_by_day_and_month(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    create_order(client, customer_headers, sample_products[0]["id"], key="sales-key-00001")

    daily = client.get(
        "/api/v1/reports/sales", headers=admin_headers, params=_period_params()
    )
    assert daily.status_code == 200
    data = daily.json()["data"]
    assert data["summary"]["order_count"] == 1
    assert data["summary"]["sales_total"] == "10.00"
    assert len(data["series"]) == 1
    assert data["series"][0]["period"] == date.today().isoformat()

    monthly = client.get(
        "/api/v1/reports/sales",
        headers=admin_headers,
        params={**_period_params(), "group_by": "month"},
    )
    assert monthly.status_code == 200
    assert monthly.json()["data"]["series"][0]["period"] == date.today().strftime("%Y-%m")


def test_top_products_limit_and_cancelled_exclusion(
    client: TestClient,
    customer_headers: dict[str, str],
    admin_headers: dict[str, str],
    sample_products: list[dict],
) -> None:
    for index, product in enumerate(sample_products, start=1):
        create_order(
            client,
            customer_headers,
            product["id"],
            key=f"top-key-{index:05d}",
        )
    cancelled = create_order(
        client, customer_headers, sample_products[0]["id"], key="top-cancel-key-01"
    )
    client.post(f"/api/v1/orders/{cancelled['id']}/cancel", headers=customer_headers)

    response = client.get(
        "/api/v1/reports/top-products",
        headers=admin_headers,
        params={**_period_params(), "limit": 2},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 2
    assert all(item["quantity_sold"] == 1 for item in data)


def test_orders_by_status_includes_all_statuses(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    response = client.get(
        "/api/v1/reports/orders-by-status",
        headers=admin_headers,
        params=_period_params(),
    )
    assert response.status_code == 200
    assert set(response.json()["data"]) == {
        "PENDING",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
    }


def test_reports_empty_period_returns_zeros(
    client: TestClient, admin_headers: dict[str, str]
) -> None:
    params = {"from": "2000-01-01", "to": "2000-01-31"}
    dashboard = client.get(
        "/api/v1/reports/dashboard", headers=admin_headers, params=params
    )
    assert dashboard.status_code == 200
    data = dashboard.json()["data"]
    assert data["period"]["order_count"] == 0
    assert data["period"]["sales_total"] == "0.00"
    assert data["today"]["order_count"] >= 0
    assert data["top_products"] == []
    assert data["daily_sales"] == []

    sales = client.get(
        "/api/v1/reports/sales", headers=admin_headers, params=params
    )
    assert sales.json()["data"]["series"] == []


def test_reports_require_admin(client: TestClient, customer_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/reports/dashboard", headers=customer_headers)
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"
