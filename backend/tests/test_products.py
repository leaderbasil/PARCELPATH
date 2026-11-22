"""Product catalog, filters and admin CRUD tests."""

from fastapi.testclient import TestClient


def _product(index: int = 0, **overrides) -> dict:  # noqa: ANN003
    payload = {
        "name": f"Product {index}",
        "sku": f"SKU-{index:04d}",
        "price": "15.50",
        "stock_quantity": 8,
        "category": "Electronics",
    }
    payload.update(overrides)
    return payload


def test_product_crud(client: TestClient, admin_headers: dict[str, str]) -> None:
    created = client.post(
        "/api/v1/products", headers=admin_headers, json=_product(1)
    )
    assert created.status_code == 201
    product_id = created.json()["data"]["id"]

    patched = client.patch(
        f"/api/v1/products/{product_id}",
        headers=admin_headers,
        json={"price": "17.00", "stock_quantity": 5},
    )
    assert patched.status_code == 200
    assert patched.json()["data"]["price"] == "17.00"

    disabled = client.delete(
        f"/api/v1/products/{product_id}", headers=admin_headers
    )
    assert disabled.status_code == 204
    assert client.get(
        f"/api/v1/products/{product_id}", headers=admin_headers
    ).json()["data"]["is_active"] is False


def test_duplicate_sku(client: TestClient, admin_headers: dict[str, str]) -> None:
    assert client.post(
        "/api/v1/products", headers=admin_headers, json=_product(2)
    ).status_code == 201
    response = client.post(
        "/api/v1/products", headers=admin_headers, json=_product(2)
    )
    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_SKU"


def test_invalid_product_values(client: TestClient, admin_headers: dict[str, str]) -> None:
    for overrides in (
        {"price": "-1.00"},
        {"stock_quantity": -1},
        {"image_url": "ftp://example.com/a.png"},
        {"sku": "invalid sku!"},
    ):
        response = client.post(
            "/api/v1/products",
            headers=admin_headers,
            json=_product(3, **overrides),
        )
        assert response.status_code == 422, overrides


def test_public_catalog_hides_stock_and_inactive(client: TestClient,
                                                 admin_headers: dict[str, str]) -> None:
    created = client.post(
        "/api/v1/products", headers=admin_headers, json=_product(4)
    ).json()["data"]
    client.delete(f"/api/v1/products/{created['id']}", headers=admin_headers)

    response = client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["total"] == 0
    assert all("stock_quantity" not in item for item in data["items"])

    admin_view = client.get("/api/v1/products", headers=admin_headers).json()["data"]
    assert admin_view["total"] == 1
    assert admin_view["items"][0]["stock_quantity"] == 8
    assert admin_view["items"][0]["in_stock"] is True


def test_search_filters_and_sort(client: TestClient, admin_headers: dict[str, str]) -> None:
    for index, (name, price) in enumerate(
        (("Alpha Phone", "10.00"), ("Beta Cable", "30.00"), ("Gamma Phone", "20.00")),
        start=5,
    ):
        client.post(
            "/api/v1/products",
            headers=admin_headers,
            json=_product(index, name=name, price=price),
        )

    response = client.get("/api/v1/products", params={"search": "phone"})
    assert response.json()["data"]["total"] == 2

    response = client.get(
        "/api/v1/products", params={"min_price": "15.00", "max_price": "25.00"}
    )
    assert response.json()["data"]["total"] == 1

    response = client.get(
        "/api/v1/products", params={"min_price": "25.00", "max_price": "15.00"}
    )
    assert response.status_code == 422

    response = client.get("/api/v1/products", params={"sort": "price_asc"})
    prices = [item["price"] for item in response.json()["data"]["items"]]
    assert prices == sorted(prices)

    response = client.get("/api/v1/products", params={"page": 99})
    assert response.status_code == 200
    assert response.json()["data"]["items"] == []
    assert response.json()["data"]["total"] == 3


def test_categories_and_low_stock(client: TestClient, admin_headers: dict[str, str]) -> None:
    client.post(
        "/api/v1/products",
        headers=admin_headers,
        json=_product(8, category="Home", stock_quantity=2),
    )
    categories = client.get("/api/v1/products/categories").json()["data"]
    assert categories == ["Home"]

    response = client.get(
        "/api/v1/products/low-stock", headers=admin_headers, params={"threshold": 5}
    )
    assert response.status_code == 200
    assert response.json()["data"][0]["stock_quantity"] == 2

    response = client.get("/api/v1/products/low-stock")
    assert response.status_code == 401
