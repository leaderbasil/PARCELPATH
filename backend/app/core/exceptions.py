"""Application exceptions carrying a stable machine-readable error code."""

from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings

ERROR_CODES: dict[int, str] = {
    400: "BAD_REQUEST",
    401: "TOKEN_INVALID",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
}


class AppException(Exception):
    """Business exception: HTTP status code, stable code, and optional meta."""

    def __init__(
        self,
        status_code: int,
        code: str,
        detail: str,
        meta: dict[str, Any] | None = None,
        errors: list[Any] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.detail = detail
        self.meta = meta or {}
        self.errors = errors or []
        super().__init__(detail)

    def to_payload(self) -> dict[str, Any]:
        """Build the user-facing error envelope."""
        payload: dict[str, Any] = {"detail": self.detail, "code": self.code}
        if self.meta:
            payload["meta"] = self.meta
        if self.errors:
            payload["errors"] = self.errors
        return payload


def error_payload(status_code: int, detail: str, code: str | None = None) -> dict[str, Any]:
    """Build a plain error envelope for framework exceptions."""
    return {"detail": detail, "code": code or ERROR_CODES.get(status_code, "INTERNAL_ERROR")}


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Return the standard envelope for business exceptions."""
    request_id = getattr(request.state, "request_id", None)
    headers = {"X-Request-ID": request_id} if request_id else None
    return JSONResponse(status_code=exc.status_code, content=exc.to_payload(), headers=headers)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic 422 errors to VALIDATION_ERROR without leaking raw values."""
    errors = [
        {
            "loc": [str(part) for part in error.get("loc", ())],
            "msg": error.get("msg", "Invalid value"),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()
    ]
    payload = error_payload(422, "Validation error", "VALIDATION_ERROR")
    payload["errors"] = errors
    return JSONResponse(status_code=422, content=payload)


async def pydantic_validation_exception_handler(
    request: Request, exc: PydanticValidationError
) -> JSONResponse:
    """Convert dependency-level Pydantic errors to the same 422 envelope."""
    return await validation_exception_handler(request, RequestValidationError(exc.errors()))


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Convert framework HTTP exceptions to the standard envelope."""
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    headers = dict(exc.headers or {})
    code = ERROR_CODES.get(exc.status_code, "INTERNAL_ERROR")
    if exc.status_code == 401:
        code = "TOKEN_INVALID"
        headers.setdefault("WWW-Authenticate", "Bearer")
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(exc.status_code, detail, code),
        headers=headers,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log unexpected errors with a request id and return a generic message."""
    import logging

    logger = logging.getLogger("app.errors")
    request_id = getattr(request.state, "request_id", "-")
    user = getattr(request.state, "user_id", "-")
    logger.exception(
        "Unhandled error request_id=%s user_id=%s path=%s",
        request_id,
        user,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content=error_payload(500, "Internal server error", "INTERNAL_ERROR"),
        headers={"X-Request-ID": request_id} if request_id else None,
    )


def debug_detail(exc: Exception) -> str:
    """Include exception details only outside production (for local diagnostics)."""
    if settings.APP_ENV.lower() == "production":
        return "Internal server error"
    return f"{type(exc).__name__}: {exc}"
