"""FastAPI application entry point."""

import logging
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Import models so Alembic and SQLAlchemy see every table.
import app.models.order  # noqa: F401
import app.models.order_item  # noqa: F401
import app.models.product  # noqa: F401
import app.models.user  # noqa: F401
from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    pydantic_validation_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.db.session import check_database_connection
from app.routers import auth, orders, products, reports, uploads, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("app")

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Mini E-Commerce Order & Shipment Tracking System",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):  # noqa: ANN001, ANN201
    """Attach a request id and log method/path/status/duration."""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    duration_ms = (time.perf_counter() - started) * 1000
    user_id = getattr(request.state, "user_id", "-")
    logger.info(
        "request_id=%s user_id=%s method=%s path=%s status=%s duration_ms=%.1f",
        request_id,
        user_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(PydanticValidationError, pydantic_validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.get("/health", tags=["Health"], summary="Health check")
def health_check() -> JSONResponse:
    """Return 200 when the database is reachable, 503 otherwise."""
    if not check_database_connection():
        return JSONResponse(
            status_code=503,
            content={"detail": "Database unavailable", "code": "DATABASE_UNAVAILABLE"},
        )
    return JSONResponse(content={"status": "ok"})


app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(products.router, prefix=settings.API_V1_PREFIX)
app.include_router(orders.router, prefix=settings.API_V1_PREFIX)
app.include_router(reports.router, prefix=settings.API_V1_PREFIX)
app.include_router(uploads.router, prefix=settings.API_V1_PREFIX)

# Object storage is served from a dedicated non-API path so it never shadows
# any existing /api/v1 route.
storage_directory = Path(settings.OBJECT_STORAGE_DIR)
storage_directory.mkdir(parents=True, exist_ok=True)
app.mount(
    settings.OBJECT_STORAGE_URL_PREFIX,
    StaticFiles(directory=storage_directory),
    name="uploads",
)
