"""Order status transition table (Section 6.2) — single source of truth."""

from typing import Final

# Allowed transitions: {(current, target): {roles allowed to perform it}}
ALLOWED: Final[dict[tuple[str, str], frozenset[str]]] = {
    ("PENDING", "CONFIRMED"): frozenset({"ADMIN"}),
    ("PENDING", "CANCELLED"): frozenset({"ADMIN", "CUSTOMER"}),
    ("CONFIRMED", "PACKED"): frozenset({"ADMIN"}),
    ("CONFIRMED", "CANCELLED"): frozenset({"ADMIN"}),
    ("PACKED", "SHIPPED"): frozenset({"ADMIN"}),
    ("PACKED", "CANCELLED"): frozenset({"ADMIN"}),
    ("SHIPPED", "OUT_FOR_DELIVERY"): frozenset({"ADMIN"}),
    ("OUT_FOR_DELIVERY", "DELIVERED"): frozenset({"ADMIN"}),
}

STATUS_TRANSITIONS: Final[dict[str, dict[str, set[str]]]] = {
    "PENDING": {"CONFIRMED": {"ADMIN"}, "CANCELLED": {"ADMIN", "CUSTOMER"}},
    "CONFIRMED": {"PACKED": {"ADMIN"}, "CANCELLED": {"ADMIN"}},
    "PACKED": {"SHIPPED": {"ADMIN"}, "CANCELLED": {"ADMIN"}},
    "SHIPPED": {"OUT_FOR_DELIVERY": {"ADMIN"}},
    "OUT_FOR_DELIVERY": {"DELIVERED": {"ADMIN"}},
    "DELIVERED": {},
    "CANCELLED": {},
}

FINAL_STATES: Final[set[str]] = {"DELIVERED", "CANCELLED"}
CUSTOMER_CANCELLABLE: Final[set[str]] = {"PENDING"}
ADMIN_CANCELLABLE: Final[set[str]] = {"PENDING", "CONFIRMED", "PACKED"}
TRACKING_REQUIRED_STATES: Final[set[str]] = {"SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"}
SHIPPING_EDITABLE_STATES: Final[set[str]] = {"SHIPPED", "OUT_FOR_DELIVERY"}

ALL_STATUSES: Final[set[str]] = {
    "PENDING",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
}


def is_valid_transition(from_status: str, to_status: str, role: str) -> bool:
    """Check whether the transition is allowed for the given role."""
    return role in ALLOWED.get((from_status, to_status), frozenset())


def is_final_state(status: str) -> bool:
    """Return True for DELIVERED and CANCELLED."""
    return status in FINAL_STATES


def is_cancellable(status: str, role: str) -> bool:
    """Check the cancellation rules for a role."""
    if role == "ADMIN":
        return status in ADMIN_CANCELLABLE
    if role == "CUSTOMER":
        return status in CUSTOMER_CANCELLABLE
    return False


def requires_tracking_number(status: str) -> bool:
    """Return True when a tracking number is mandatory."""
    return status in TRACKING_REQUIRED_STATES


def is_shipping_editable(status: str) -> bool:
    """Return True when carrier/tracking number may be corrected."""
    return status in SHIPPING_EDITABLE_STATES
