"""Order number generation backed by the `order_number_seq` database sequence."""

from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.orm import Session


def format_order_number(sequence_value: int, year: int | None = None) -> str:
    """Format an order number as ORD-{YYYY}-{seq:06d}."""
    if year is None:
        year = datetime.now(timezone.utc).year
    return f"ORD-{year}-{sequence_value:06d}"


def next_order_number(db: Session) -> str:
    """Allocate the next sequence value inside the current transaction."""
    value = db.execute(text("SELECT nextval('order_number_seq')")).scalar_one()
    return format_order_number(int(value))
