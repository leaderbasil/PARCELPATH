"""Decimal-only money helpers. Never use float for amounts."""

from decimal import Decimal, ROUND_HALF_UP

CENTS = Decimal("0.01")


def round2(value: Decimal) -> Decimal:
    """Round to two decimals using ROUND_HALF_UP (not banker's rounding)."""
    return Decimal(value).quantize(CENTS, rounding=ROUND_HALF_UP)


def money_to_str(amount: Decimal) -> str:
    """Serialize an amount as a fixed two-decimal string, e.g. "12.50"."""
    return f"{round2(amount):.2f}"


def str_to_money(value: str) -> Decimal:
    """Parse a money string into a Decimal."""
    return round2(Decimal(str(value)))
