"""Reporting service: aggregates over non-cancelled orders."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.user import User
from app.utils.money import money_to_str, round2
from app.utils.status_machine import ALL_STATUSES
from app.services.order_service import validate_date_range

EXCLUDED_FROM_SALES = "CANCELLED"


def _timezone() -> ZoneInfo:
    return ZoneInfo(settings.REPORT_TIMEZONE)


def _parse_date(value: str | None, field: str) -> date | None:
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise AppException(422, "VALIDATION_ERROR", f"{field} must be YYYY-MM-DD") from None


def _resolve_range(from_: str | None, to: str | None) -> tuple[date, date]:
    from_value = _parse_date(from_, "from")
    to_value = _parse_date(to, "to")
    return validate_date_range(from_value, to_value)


def _utc_bounds(day_from: date, day_to: date) -> tuple[datetime, datetime]:
    zone = _timezone()
    start = datetime.combine(day_from, time.min, tzinfo=zone).astimezone(timezone.utc)
    end = datetime.combine(day_to + timedelta(days=1), time.min, tzinfo=zone).astimezone(
        timezone.utc
    )
    return start, end


def _local_day(value: datetime) -> date:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(_timezone()).date()


def _local_period(value: datetime, group_by: str) -> str:
    day = _local_day(value)
    return day.isoformat() if group_by == "day" else day.strftime("%Y-%m")


def _summary(rows: list[Order]) -> tuple[int, Decimal, str]:
    total = round2(sum((row.total_amount for row in rows), Decimal("0")))
    average = round2(total / len(rows)) if rows else Decimal("0.00")
    return len(rows), total, money_to_str(average)


def _sales_rows(db: Session, start: datetime, end: datetime) -> list[Order]:
    return list(
        db.scalars(
            select(Order).where(
                Order.created_at >= start,
                Order.created_at < end,
                Order.status != EXCLUDED_FROM_SALES,
            )
        ).all()
    )


def _status_counts(db: Session, start: datetime, end: datetime) -> dict[str, int]:
    counts = {status: 0 for status in sorted(ALL_STATUSES)}
    rows = db.execute(
        select(Order.status, func.count())
        .where(Order.created_at >= start, Order.created_at < end)
        .group_by(Order.status)
    ).all()
    for status, count in rows:
        counts[str(status)] = int(count)
    return counts


def _top_products(db: Session, order_ids: list[UUID], limit: int) -> list[dict]:
    """Aggregate order item snapshots into a ranked product list."""
    if not order_ids:
        return []
    item_rows = db.scalars(
        select(OrderItem).where(OrderItem.order_id.in_(order_ids))
    ).all()
    totals: dict[UUID, dict] = {}
    for item in item_rows:
        entry = totals.setdefault(
            item.product_id,
            {
                "product_id": str(item.product_id),
                "product_name": item.product_name,
                "sku": item.sku,
                "quantity_sold": 0,
                "revenue": Decimal("0"),
            },
        )
        entry["quantity_sold"] += item.quantity
        entry["revenue"] += item.line_total
    for entry in totals.values():
        entry["revenue"] = money_to_str(entry["revenue"])
    return sorted(
        totals.values(),
        key=lambda entry: (-entry["quantity_sold"], entry["product_name"]),
    )[:limit]


def get_dashboard(db: Session, from_: str | None, to: str | None) -> dict:
    """Build the dashboard response from Section 20.4."""
    day_from, day_to = _resolve_range(from_, to)
    start, end = _utc_bounds(day_from, day_to)

    period_rows = _sales_rows(db, start, end)
    period_count, period_total, period_average = _summary(period_rows)

    zone = _timezone()
    today_local = datetime.now(zone).date()
    today_start, today_end = _utc_bounds(today_local, today_local)
    today_rows = _sales_rows(db, today_start, today_end)
    today_count, today_total, _ = _summary(today_rows)

    status_counts = _status_counts(db, start, end)
    low_stock_count = int(
        db.scalar(
            select(func.count())
            .select_from(Product)
            .where(Product.is_active.is_(True), Product.stock_quantity <= 5)
        )
        or 0
    )

    top_products = _top_products(db, [row.id for row in period_rows], 5)

    daily: dict[str, dict] = defaultdict(lambda: {"total": Decimal("0"), "count": 0})
    for row in period_rows:
        bucket = daily[_local_day(row.created_at).isoformat()]
        bucket["total"] += row.total_amount
        bucket["count"] += 1
    daily_sales = [
        {
            "date": day,
            "total": money_to_str(values["total"]),
            "count": values["count"],
        }
        for day, values in sorted(daily.items())
    ]

    return {
        "today": {"order_count": today_count, "sales_total": money_to_str(today_total)},
        "period": {
            "from": day_from.isoformat(),
            "to": day_to.isoformat(),
            "order_count": period_count,
            "sales_total": money_to_str(period_total),
            "average_order": period_average,
        },
        "orders_by_status": status_counts,
        "pending_count": status_counts.get("PENDING", 0),
        "low_stock_count": low_stock_count,
        "top_products": top_products,
        "daily_sales": daily_sales,
    }


def get_sales(db: Session, from_: str | None, to: str | None, group_by: str) -> dict:
    """Build the sales summary and grouped series."""
    day_from, day_to = _resolve_range(from_, to)
    start, end = _utc_bounds(day_from, day_to)
    rows = _sales_rows(db, start, end)
    count, total, average = _summary(rows)

    series_map: dict[str, dict] = defaultdict(lambda: {"total": Decimal("0"), "count": 0})
    for row in rows:
        bucket = series_map[_local_period(row.created_at, group_by)]
        bucket["total"] += row.total_amount
        bucket["count"] += 1

    return {
        "summary": {
            "sales_total": money_to_str(total),
            "order_count": count,
            "average_order": average,
        },
        "series": [
            {
                "period": period,
                "total": money_to_str(values["total"]),
                "count": values["count"],
            }
            for period, values in sorted(series_map.items())
        ],
    }


def get_top_products(db: Session, from_: str | None, to: str | None, limit: int) -> list[dict]:
    """Return the best-selling products, excluding cancelled orders."""
    day_from, day_to = _resolve_range(from_, to)
    start, end = _utc_bounds(day_from, day_to)
    rows = _sales_rows(db, start, end)
    return _top_products(db, [row.id for row in rows], limit)


def get_orders_by_status(db: Session, from_: str | None, to: str | None) -> dict[str, int]:
    """Return counts for all seven statuses within the period."""
    day_from, day_to = _resolve_range(from_, to)
    start, end = _utc_bounds(day_from, day_to)
    return _status_counts(db, start, end)


def active_admin(db: Session, user: User) -> bool:
    """Guard used by the router layer (permissions are authoritative)."""
    return bool(user.is_active)
