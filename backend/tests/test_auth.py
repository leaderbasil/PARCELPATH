"""Authentication and authorization tests."""

from fastapi.testclient import TestClient


def test_register_customer(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Jane Doe",
            "email": "Jane@Example.com",
            "password": "password123",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["data"]["email"] == "jane@example.com"
    assert body["data"]["role"] == "CUSTOMER"
    assert "password_hash" not in body["data"]


def test_register_rejects_role_field(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Jane Doe",
            "email": "jane@example.com",
            "password": "password123",
            "role": "ADMIN",
        },
    )
    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_duplicate_email_case_insensitive(client: TestClient) -> None:
    payload = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "password": "password123",
    }
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    payload["email"] = "JANE@EXAMPLE.COM"
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["code"] == "DUPLICATE_EMAIL"


def test_login_success_and_me(client: TestClient, customer_headers: dict[str, str]) -> None:
    response = client.get("/api/v1/auth/me", headers=customer_headers)
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "customer@test.local"


def test_login_failures_have_same_message(client: TestClient) -> None:
    for email in ("missing@test.local", "customer@test.local"):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "WrongPassword123"},
        )
        assert response.status_code == 401
        assert response.json() == {
            "detail": "Invalid email or password",
            "code": "INVALID_CREDENTIALS",
        }


def test_inactive_user_cannot_login(client: TestClient, admin_headers: dict[str, str]) -> None:
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Disabled User",
            "email": "disabled@test.local",
            "password": "password123",
        },
    )
    me = client.get(
        "/api/v1/auth/me",
        headers={
            "Authorization": "Bearer "
            + client.post(
                "/api/v1/auth/login",
                json={"email": "disabled@test.local", "password": "password123"},
            ).json()["data"]["access_token"]
        },
    )
    user_id = me.json()["data"]["id"]
    response = client.patch(
        f"/api/v1/users/{user_id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert response.status_code == 200
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "disabled@test.local", "password": "password123"},
    )
    assert response.status_code == 403
    assert response.json()["code"] == "USER_INACTIVE"


def test_token_of_deactivated_user(client: TestClient, admin_headers: dict[str, str]) -> None:
    token = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Later Disabled",
            "email": "later@test.local",
            "password": "password123",
        },
    )
    assert token.status_code == 201
    user_id = token.json()["data"]["id"]
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "later@test.local", "password": "password123"},
    ).json()
    headers = {"Authorization": f"Bearer {login['data']['access_token']}"}
    assert client.patch(
        f"/api/v1/users/{user_id}/status",
        headers=admin_headers,
        json={"is_active": False},
    ).status_code == 200
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 403
    assert response.json()["code"] == "USER_INACTIVE"


def test_missing_or_invalid_token(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"}
    )
    assert response.status_code == 401
    assert response.json()["code"] == "TOKEN_INVALID"


def test_customer_cannot_use_admin_endpoints(
    client: TestClient, customer_headers: dict[str, str]
) -> None:
    response = client.get("/api/v1/users", headers=customer_headers)
    assert response.status_code == 403
    assert response.json()["code"] == "FORBIDDEN"


def test_admin_self_protection(client: TestClient, admin_headers: dict[str, str]) -> None:
    me = client.get("/api/v1/auth/me", headers=admin_headers).json()["data"]
    response = client.patch(
        f"/api/v1/users/{me['id']}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert response.status_code == 409
    assert response.json()["code"] == "CANNOT_MODIFY_SELF"
