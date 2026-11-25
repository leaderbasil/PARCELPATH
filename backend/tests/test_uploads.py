"""Object-storage upload endpoint coverage."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings

PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.fixture
def upload_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Redirect uploads to an isolated temporary directory."""
    directory = tmp_path / "objects"
    directory.mkdir()
    monkeypatch.setattr(settings, "OBJECT_STORAGE_DIR", str(directory))
    return directory


def test_admin_can_upload_image(
    client: TestClient, admin_headers: dict[str, str], upload_dir: Path
) -> None:
    response = client.post(
        "/api/v1/uploads",
        headers=admin_headers,
        files={"file": ("product.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["message"] == "Image uploaded"
    assert settings.OBJECT_STORAGE_URL_PREFIX in body["data"]["url"]
    assert body["data"]["url"].endswith(".png")

    stored = list(upload_dir.glob("*.png"))
    assert len(stored) == 1
    assert stored[0].read_bytes() == PNG_BYTES


def test_customer_cannot_upload(
    client: TestClient, customer_headers: dict[str, str], upload_dir: Path
) -> None:
    response = client.post(
        "/api/v1/uploads",
        headers=customer_headers,
        files={"file": ("product.png", PNG_BYTES, "image/png")},
    )
    assert response.status_code == 403, response.text
    assert list(upload_dir.glob("*.png")) == []


def test_upload_rejects_mismatched_content(
    client: TestClient, admin_headers: dict[str, str], upload_dir: Path
) -> None:
    response = client.post(
        "/api/v1/uploads",
        headers=admin_headers,
        files={"file": ("fake.png", b"not-an-image", "image/png")},
    )
    assert response.status_code == 400, response.text
    assert response.json()["code"] == "BAD_REQUEST"
    assert list(upload_dir.iterdir()) == []
