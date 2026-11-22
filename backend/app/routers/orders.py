"""Orders router: creation, tracking and lifecycle management."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response, status

from app.core.permissions import AdminUser, CurrentUser, DbSession, role_of
from app.schemas.common import Envelope, PageEnvelope
from app.schemas.order import (
    OrderCreate,
    OrderListItem,
    OrderListParams,
    OrderOut,
    OrderShipIn,
    OrderStatusIn,
    ShippingUpdateIn,
    TrackingOut,
)
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=Envelope[OrderOut],
    summary="Create an order",
)
def create_order(
    response: Response,
    db: DbSession,
    user: CurrentUser,
    payload: OrderCreate,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=8, max_length=100),
) -> dict:
    """Create an order; replaying the same key returns the original order."""
    order, created = order_service.create_order(db, user, payload, idempotency_key)
    if not created:
        response.status_code = status.HTTP_200_OK
    items = order_service._items_for(db, order.id)
    return {
        "data": order_service.serialize_order(order, items, False),
        "message": "Order created",
    }


@router.get("", response_model=PageEnvelope[OrderListItem], summary="List orders")
def list_orders(
    db: DbSession,
    user: CurrentUser,
    params: OrderListParams = Depends(),
) -> dict:
    """Customers see their own orders; admins see all orders."""
    rows, counts, total = order_service.list_orders(db, user, params)
    is_admin = role_of(user) == "ADMIN"
    return {
        "data": {
            "items": [
                order_service.serialize_list_item(row, count, is_admin)
                for row, count in zip(rows, counts)
            ],
            "total": total,
            "page": params.page,
            "page_size": params.page_size,
        },
        "message": "Orders list",
    }


@router.get("/{order_id}", response_model=Envelope[OrderOut], summary="Order details")
def get_order(order_id: UUID, db: DbSession, user: CurrentUser) -> dict:
    """Get an order with its item snapshots."""
    order = order_service.get_order(db, user, order_id)
    items = order_service._items_for(db, order.id)
    return {
        "data": order_service.serialize_order(order, items, role_of(user) == "ADMIN"),
        "message": "Order details",
    }


@router.get(
    "/{order_id}/tracking", response_model=Envelope[TrackingOut], summary="Track an order"
)
def track_order(order_id: UUID, db: DbSession, user: CurrentUser) -> dict:
    """Return the current status, carrier and chronological events."""
    return {
        "data": order_service.get_tracking(db, user, order_id),
        "message": "Tracking details",
    }


@router.post("/{order_id}/cancel", response_model=Envelope[OrderOut], summary="Cancel an order")
def cancel_order(order_id: UUID, db: DbSession, user: CurrentUser) -> dict:
    """Cancel an order and restore its inventory once."""
    order = order_service.cancel_order(db, user, order_id)
    items = order_service._items_for(db, order.id)
    return {
        "data": order_service.serialize_order(order, items, role_of(user) == "ADMIN"),
        "message": "Order cancelled",
    }


@router.patch(
    "/{order_id}/status", response_model=Envelope[OrderOut], summary="Change order status"
)
def change_status(
    order_id: UUID, payload: OrderStatusIn, admin: AdminUser, db: DbSession
) -> dict:
    """Perform an allowed status transition."""
    order = order_service.change_status(db, admin, order_id, payload)
    items = order_service._items_for(db, order.id)
    return {
        "data": order_service.serialize_order(order, items, True),
        "message": "Order status updated",
    }


@router.post("/{order_id}/ship", response_model=Envelope[OrderOut], summary="Ship an order")
def ship_order(
    order_id: UUID, payload: OrderShipIn, admin: AdminUser, db: DbSession
) -> dict:
    """Move a packed order to SHIPPED with carrier and tracking number."""
    order = order_service.ship_order(db, admin, order_id, payload)
    items = order_service._items_for(db, order.id)
    return {
        "data": order_service.serialize_order(order, items, True),
        "message": "Order shipped",
    }


@router.patch(
    "/{order_id}/shipping", response_model=Envelope[OrderOut], summary="Correct shipping info"
)
def update_shipping(
    order_id: UUID, payload: ShippingUpdateIn, admin: AdminUser, db: DbSession
) -> dict:
    """Correct carrier/tracking number after shipment."""
    order = order_service.update_shipping(db, admin, order_id, payload)
    items = order_service._items_for(db, order.id)
    return {
        "data": order_service.serialize_order(order, items, True),
        "message": "Shipping information updated",
    }
