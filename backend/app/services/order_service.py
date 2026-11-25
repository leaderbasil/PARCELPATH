"""Order service: creation, inventory, lifecycle, shipment and tracking."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    OrderCreate,
    OrderListParams,
    OrderShipIn,
    OrderStatusIn,
    ShippingUpdateIn,
)
from app.utils.money import money_to_str, round2
from app.utils.order_number import next_order_number
from app.utils.pagination import paginate
from app.utils.status_machine import (
    ALLOWED,
    is_shipping_editable,
)


def role_of(user: User) -> str:
    """Return the role as its stored string value."""
    return getattr(user.role, "value", str(user.role))


def new_event(status: str, note: str | None, by: UUID) -> dict[str, Any]:
    """Build a tracking event stored inside orders.tracking_events."""
    return {
        "status": status,
        "note": note,
        "at": datetime.now(timezone.utc).isoformat(),
        "by": str(by),
    }


def append_event(order: Order, event: dict[str, Any]) -> None:
    """Replace the JSONB list so SQLAlchemy detects the mutation."""
    order.tracking_events = [*order.tracking_events, event]


def _items_for(db: Session, order_id: UUID) -> list[OrderItem]:
    return list(
        db.scalars(
            select(OrderItem).where(OrderItem.order_id == order_id).order_by(OrderItem.id)
        ).all()
    )


def _customer_brief(order: Order, include: bool) -> dict[str, Any] | None:
    if not include or order.customer is None:
        return None
    customer = order.customer
    return {
        "id": str(customer.id),
        "full_name": customer.full_name,
        "email": customer.email,
        "phone": customer.phone,
    }


def serialize_order(order: Order, items: list[OrderItem], include_customer: bool) -> dict[str, Any]:
    """Build the public response shape defined in Section 9.4."""
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "subtotal": money_to_str(order.subtotal),
        "shipping_fee": money_to_str(order.shipping_fee),
        "total_amount": money_to_str(order.total_amount),
        "shipping": {
            "name": order.shipping_name,
            "phone": order.shipping_phone,
            "city": order.shipping_city,
            "address": order.shipping_address,
        },
        "carrier": order.carrier,
        "tracking_number": order.tracking_number,
        "created_at": order.created_at,
        "items": [
            {
                "product_id": str(item.product_id),
                "product_name": item.product_name,
                "sku": item.sku,
                "quantity": item.quantity,
                "unit_price": money_to_str(item.unit_price),
                "line_total": money_to_str(item.line_total),
            }
            for item in items
        ],
        "customer": _customer_brief(order, include_customer),
    }


def serialize_list_item(order: Order, items_count: int, include_customer: bool) -> dict[str, Any]:
    """Build the compact list row defined in Section 20.1."""
    return {
        "id": str(order.id),
        "order_number": order.order_number,
        "status": order.status,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "total_amount": money_to_str(order.total_amount),
        "items_count": items_count,
        "created_at": order.created_at,
        "customer": _customer_brief(order, include_customer),
    }


def _merge_quantities(payload: OrderCreate) -> dict[UUID, int]:
    """Merge repeated product ids, rejecting a merged quantity above 99."""
    merged: dict[UUID, int] = {}
    for line in payload.items:
        merged[line.product_id] = merged.get(line.product_id, 0) + line.quantity
    if any(quantity > 99 for quantity in merged.values()):
        raise AppException(
            422,
            "VALIDATION_ERROR",
            "Merged quantity for a product must not exceed 99",
        )
    return merged


def create_order(db: Session, user: User, payload: OrderCreate, key: str) -> tuple[Order, bool]:
    """Create an order atomically; returns (order, created)."""
    if role_of(user) != "CUSTOMER":
        raise AppException(403, "FORBIDDEN", "Only customers can place orders")

    existing = db.scalar(select(Order).where(Order.idempotency_key == key))
    if existing is not None:
        if existing.customer_id != user.id:
            raise AppException(
                409, "IDEMPOTENCY_KEY_CONFLICT", "Idempotency key belongs to another user"
            )
        return existing, False

    if not payload.items:
        raise AppException(422, "EMPTY_CART", "Cart is empty")

    wanted = _merge_quantities(payload)

    # Lock products in a deterministic order to avoid deadlocks.
    products = list(
        db.scalars(
            select(Product)
            .where(Product.id.in_(wanted.keys()))
            .order_by(Product.id)
            .with_for_update()
        ).all()
    )
    by_id = {product.id: product for product in products}

    missing = next((product_id for product_id in wanted if product_id not in by_id), None)
    if missing is not None:
        raise AppException(
            404,
            "PRODUCT_NOT_FOUND",
            "Product not found",
            meta={"product_id": str(missing)},
        )

    inactive = [product for product in products if not product.is_active]
    if inactive:
        raise AppException(
            409, "PRODUCT_INACTIVE", "One or more products are inactive"
        )

    insufficient = [
        {
            "product_id": str(product.id),
            "product_name": product.name,
            "available": product.stock_quantity,
            "requested": wanted[product.id],
        }
        for product in products
        if product.stock_quantity < wanted[product.id]
    ]
    if insufficient:
        raise AppException(
            409,
            "INSUFFICIENT_STOCK",
            "Insufficient stock for one or more products",
            meta={"items": insufficient},
        )

    shipping_fee = round2(Decimal(settings.SHIPPING_FEE))
    line_values = [
        (product, wanted[product.id], round2(wanted[product.id] * product.price))
        for product in products
    ]
    subtotal = round2(sum((line_total for _, _, line_total in line_values), Decimal("0")))
    total = round2(subtotal + shipping_fee)

    order = Order(
        order_number=next_order_number(db),
        customer_id=user.id,
        status="PENDING",
        payment_method=payload.payment_method,
        payment_status="PAID" if payload.payment_method == "CARD" else "UNPAID",
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total_amount=total,
        shipping_name=payload.shipping.name,
        shipping_phone=payload.shipping.phone,
        shipping_city=payload.shipping.city,
        shipping_address=payload.shipping.address,
        idempotency_key=key,
        tracking_events=[new_event("PENDING", "تم إنشاء الطلب", user.id)],
    )
    order.items = [
        OrderItem(
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            quantity=quantity,
            unit_price=product.price,
            line_total=line_total,
        )
        for product, quantity, line_total in line_values
    ]
    for product, quantity, _ in line_values:
        product.stock_quantity -= quantity

    db.add(order)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        race_winner = db.scalar(select(Order).where(Order.idempotency_key == key))
        if race_winner is None:
            raise
        if race_winner.customer_id != user.id:
            raise AppException(
                409,
                "IDEMPOTENCY_KEY_CONFLICT",
                "Idempotency key belongs to another user",
            ) from None
        return race_winner, False
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order, True


def validate_date_range(from_date: date | None, to_date: date | None) -> tuple[date, date]:
    """Apply the default 30-day window and reject invalid ranges."""
    to_value = to_date or datetime.now(timezone.utc).date()
    from_value = from_date or (to_value - timedelta(days=29))
    if from_value > to_value or (to_value - from_value).days > 366:
        raise AppException(
            400,
            "INVALID_DATE_RANGE",
            "Invalid date range",
            meta={"from": from_value.isoformat(), "to": to_value.isoformat()},
        )
    return from_value, to_value


def list_orders(
    db: Session, actor: User, params: OrderListParams
) -> tuple[list[Order], list[int], int]:
    """List orders scoped to the actor, with filters and pagination."""
    validate_date_range(params.from_, params.to)
    is_admin = role_of(actor) == "ADMIN"

    statement = select(Order)
    if not is_admin:
        statement = statement.where(Order.customer_id == actor.id)
    if params.status:
        statement = statement.where(Order.status == params.status)
    if params.from_ is not None and params.to is not None:
        statement = statement.where(
            Order.created_at >= datetime.combine(params.from_, datetime.min.time(), tzinfo=timezone.utc),
            Order.created_at < datetime.combine(params.to, datetime.max.time(), tzinfo=timezone.utc),
        )
    if params.order_number:
        term = params.order_number.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        statement = statement.where(Order.order_number.ilike(f"%{term}%", escape="\\"))
    if is_admin and params.customer_id is not None:
        statement = statement.where(Order.customer_id == params.customer_id)

    statement = statement.order_by(Order.created_at.desc(), Order.id)
    rows, total = paginate(db, statement, params)
    item_counts = [len(_items_for(db, order.id)) for order in rows]
    return rows, item_counts, total


def get_order(db: Session, actor: User, order_id: UUID) -> Order:
    """Fetch an order, hiding other customers' orders as 404."""
    order = db.get(Order, order_id)
    if order is None or (role_of(actor) != "ADMIN" and order.customer_id != actor.id):
        raise AppException(404, "ORDER_NOT_FOUND", "Order not found")
    return order


def get_tracking(db: Session, actor: User, order_id: UUID) -> dict[str, Any]:
    """Return the tracking view with events oldest-first and no `by` field."""
    order = get_order(db, actor, order_id)
    events = [
        {key: event.get(key) for key in ("status", "note", "at")}
        for event in sorted(order.tracking_events, key=lambda item: str(item.get("at", "")))
    ]
    return {
        "order_number": order.order_number,
        "status": order.status,
        "carrier": order.carrier,
        "tracking_number": order.tracking_number,
        "events": events,
    }


def _lock_order(db: Session, order_id: UUID) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if order is None:
        raise AppException(404, "ORDER_NOT_FOUND", "Order not found")
    return order


def change_status(
    db: Session, actor: User, order_id: UUID, payload: OrderStatusIn
) -> Order:
    """Perform an allowed status transition."""
    order = _lock_order(db, order_id)
    target = payload.status
    if not is_transition_allowed(order.status, target, role_of(actor)):
        raise AppException(
            409,
            "INVALID_STATUS_TRANSITION",
            f"Cannot change status from {order.status} to {target}",
        )

    apply_target_state(order, target, actor.id, payload.note)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order


def is_transition_allowed(current: str, target: str, role: str) -> bool:
    """Check the central transition table."""
    return role in ALLOWED.get((current, target), frozenset())


def apply_target_state(
    order: Order, target: str, actor_id: UUID, note: str | None
) -> None:
    """Update lifecycle fields and append the tracking event in memory."""
    if target == "DELIVERED":
        order.delivered_at = datetime.now(timezone.utc)
        if order.payment_method == "COD":
            order.payment_status = "PAID"
    append_event(order, new_event(target, note, actor_id))
    order.status = target


def ship_order(db: Session, actor: User, order_id: UUID, payload: OrderShipIn) -> Order:
    """Move PACKED -> SHIPPED, storing carrier and a unique tracking number."""
    order = _lock_order(db, order_id)
    if not is_transition_allowed(order.status, "SHIPPED", role_of(actor)):
        raise AppException(
            409,
            "INVALID_STATUS_TRANSITION",
            f"Cannot ship an order in status {order.status}",
        )
    if not payload.carrier or not payload.tracking_number:
        raise AppException(
            422, "SHIPPING_INFO_REQUIRED", "Carrier and tracking number are required"
        )
    if db.scalar(
        select(Order.id).where(
            Order.tracking_number == payload.tracking_number, Order.id != order.id
        )
    ):
        raise AppException(
            409, "DUPLICATE_TRACKING_NUMBER", "Tracking number is already in use"
        )

    order.carrier = payload.carrier
    order.tracking_number = payload.tracking_number
    order.shipped_at = datetime.now(timezone.utc)
    apply_target_state(order, "SHIPPED", actor.id, payload.note)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppException(
            409, "DUPLICATE_TRACKING_NUMBER", "Tracking number is already in use"
        ) from None
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order


def update_shipping(
    db: Session, actor: User, order_id: UUID, payload: ShippingUpdateIn
) -> Order:
    """Correct carrier/tracking number in SHIPPED or OUT_FOR_DELIVERY."""
    order = _lock_order(db, order_id)
    if not is_shipping_editable(order.status):
        raise AppException(
            409,
            "SHIPPING_NOT_EDITABLE",
            "Shipping information can only be edited after shipment",
        )
    if payload.tracking_number is not None and db.scalar(
        select(Order.id).where(
            Order.tracking_number == payload.tracking_number, Order.id != order.id
        )
    ):
        raise AppException(
            409, "DUPLICATE_TRACKING_NUMBER", "Tracking number is already in use"
        )

    fields: list[str] = []
    if payload.carrier is not None:
        order.carrier = payload.carrier
        fields.append("الناقل")
    if payload.tracking_number is not None:
        order.tracking_number = payload.tracking_number
        fields.append("رقم التتبّع")
    append_event(
        order,
        new_event(
            order.status,
            payload.note or f"تم تحديث بيانات الشحن: {', '.join(fields)}",
            actor.id,
        ),
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppException(
            409, "DUPLICATE_TRACKING_NUMBER", "Tracking number is already in use"
        ) from None
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order


def cancel_order(db: Session, actor: User, order_id: UUID) -> Order:
    """Cancel an order and restore stock exactly once."""
    order = _lock_order(db, order_id)
    if order.status == "CANCELLED":
        raise AppException(
            409, "ORDER_ALREADY_CANCELLED", "Order is already cancelled"
        )

    role = role_of(actor)
    if not is_transition_allowed(order.status, "CANCELLED", role):
        raise AppException(
            409,
            "ORDER_NOT_CANCELLABLE",
            "Order cannot be cancelled in its current status",
        )

    item_rows = _items_for(db, order.id)
    product_ids = sorted({item.product_id for item in item_rows})
    products = list(
        db.scalars(
            select(Product)
            .where(Product.id.in_(product_ids))
            .order_by(Product.id)
            .with_for_update()
        ).all()
    )
    by_id = {product.id: product for product in products}
    for item in item_rows:
        product = by_id.get(item.product_id)
        if product is not None:
            product.stock_quantity += item.quantity

    order.status = "CANCELLED"
    order.cancelled_at = datetime.now(timezone.utc)
    append_event(order, new_event("CANCELLED", "تم إلغاء الطلب", actor.id))
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order
