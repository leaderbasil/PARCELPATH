"""Admin-only object-storage upload endpoint."""

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Request, UploadFile, status

from app.core.config import settings
from app.core.exceptions import AppException
from app.core.permissions import AdminUser
from app.schemas.common import Envelope
from app.schemas.upload import UploadOut

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _sniff_extension(payload: bytes) -> str | None:
    """Return a safe extension based on the file signature, not its name."""
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if payload.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if payload.startswith((b"GIF87a", b"GIF89a")):
        return ".gif"
    if len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return ".webp"
    return None


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=Envelope[UploadOut],
    summary="Upload a product image",
)
async def upload_image(
    request: Request,
    admin: AdminUser,
    file: UploadFile = File(...),
) -> dict:
    """Store an image as an object and return its public URL."""
    del admin  # Authorization is enforced by the dependency.

    declared_type = (file.content_type or "").split(";", 1)[0].strip().lower()
    expected_extension = ALLOWED_TYPES.get(declared_type)
    if expected_extension is None:
        raise AppException(400, "BAD_REQUEST", "Only PNG, JPEG, WebP and GIF images are accepted")

    payload = await file.read(settings.MAX_UPLOAD_BYTES + 1)
    if not payload:
        raise AppException(400, "BAD_REQUEST", "The uploaded file is empty")
    if len(payload) > settings.MAX_UPLOAD_BYTES:
        raise AppException(400, "BAD_REQUEST", "The uploaded image is too large")

    actual_extension = _sniff_extension(payload)
    if actual_extension != expected_extension:
        raise AppException(400, "BAD_REQUEST", "The file content does not match its image type")

    directory = Path(settings.OBJECT_STORAGE_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{actual_extension}"
    (directory / name).write_bytes(payload)

    public_base = settings.OBJECT_STORAGE_PUBLIC_BASE_URL.strip().rstrip("/")
    origin = public_base or str(request.base_url).rstrip("/")
    url = f"{origin}{settings.OBJECT_STORAGE_URL_PREFIX}/{name}"
    return {"data": {"url": url}, "message": "Image uploaded"}
