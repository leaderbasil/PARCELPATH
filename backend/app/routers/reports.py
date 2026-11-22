"""Reports router (admin only)."""

from fastapi import APIRouter, Query

from app.core.permissions import AdminUser, DbSession
from app.schemas.common import Envelope
from app.schemas.report import (
    DashboardReportOut,
    SalesReportOut,
    TopProductOut,
)
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "/dashboard",
    response_model=Envelope[DashboardReportOut],
    summary="Dashboard overview",
)
def get_dashboard(
    admin: AdminUser,
    db: DbSession,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
) -> dict:
    """Return dashboard KPIs, status counts and recent sales."""
    return {
        "data": report_service.get_dashboard(db, from_, to),
        "message": "Dashboard report",
    }


@router.get("/sales", response_model=Envelope[SalesReportOut], summary="Sales report")
def get_sales(
    admin: AdminUser,
    db: DbSession,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
    group_by: str = Query(default="day", pattern="^(day|month)$"),
) -> dict:
    """Return the sales summary and a daily or monthly series."""
    return {
        "data": report_service.get_sales(db, from_, to, group_by),
        "message": "Sales report",
    }


@router.get(
    "/top-products",
    response_model=Envelope[list[TopProductOut]],
    summary="Top products",
)
def get_top_products(
    admin: AdminUser,
    db: DbSession,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
    limit: int = Query(default=5, ge=1, le=50),
) -> dict:
    """Return the best-selling products in the period."""
    return {
        "data": report_service.get_top_products(db, from_, to, limit),
        "message": "Top products",
    }


@router.get(
    "/orders-by-status",
    response_model=Envelope[dict[str, int]],
    summary="Orders by status",
)
def get_orders_by_status(
    admin: AdminUser,
    db: DbSession,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = None,
) -> dict:
    """Return the count of orders in each status."""
    return {
        "data": report_service.get_orders_by_status(db, from_, to),
        "message": "Orders by status",
    }
