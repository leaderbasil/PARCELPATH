"""Report response schemas."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import BaseOut, Money


class SalesSummary(BaseModel):
    """Aggregate sales figures."""

    order_count: int
    sales_total: Money


class PeriodSummary(SalesSummary):
    """Sales figures with an average."""

    average_order: Money


class PeriodOut(BaseModel):
    """Inclusive reporting period."""

    from_: Annotated[str, Field(alias="from")]
    to: str
    order_count: int
    sales_total: Money
    average_order: Money


class TopProductOut(BaseModel):
    """Best-selling product row."""

    product_id: UUID
    product_name: str
    sku: str
    quantity_sold: int
    revenue: Money


class DailySalesOut(BaseModel):
    """One point of the daily sales series."""

    date: str
    total: Money
    count: int


class SeriesPointOut(BaseModel):
    """One point of the sales time series."""

    period: str
    total: Money
    count: int


class SalesReportOut(BaseModel):
    """GET /reports/sales response."""

    summary: PeriodSummary
    series: list[SeriesPointOut]


class DashboardReportOut(BaseModel):
    """GET /reports/dashboard response."""

    today: SalesSummary
    period: PeriodOut
    orders_by_status: dict[str, int]
    pending_count: int
    low_stock_count: int
    top_products: list[TopProductOut]
    daily_sales: list[DailySalesOut]


class ReportParams(BaseModel):
    """Common reporting query parameters."""

    from_: Annotated[str | None, Field(alias="from")] = None
    to: str | None = None
    group_by: Literal["day", "month"] = "day"
    limit: int = Field(default=5, ge=1, le=50)
