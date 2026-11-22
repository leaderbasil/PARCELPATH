"""Products router: public catalog and admin CRUD."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.permissions import AdminUser, DbSession, OptionalUser, role_of
from app.schemas.common import Envelope, PageEnvelope
from app.schemas.product import (
    ProductAdminOut,
    ProductCreate,
    ProductListParams,
    ProductPublicOut,
    ProductUpdate,
)
from app.services import product_service

router = APIRouter(prefix="/products", tags=["Products"])

ProductOut = ProductAdminOut | ProductPublicOut


@router.get("", response_model=PageEnvelope[ProductOut], summary="Browse products")
def list_products(
    db: DbSession,
    user: OptionalUser,
    params: ProductListParams = Depends(),
) -> dict:
    """Public catalog; admins additionally see inactive products and stock."""
    is_admin = user is not None and role_of(user) == "ADMIN"
    rows, total = product_service.list_products(db, params, is_admin)
    return {
        "data": {
            "items": [product_service.serialize_product(row, is_admin) for row in rows],
            "total": total,
            "page": params.page,
            "page_size": params.page_size,
        },
        "message": "Products list",
    }


@router.get("/categories", response_model=Envelope[list[str]], summary="Product categories")
def list_categories(db: DbSession) -> dict:
    """List distinct categories of active products."""
    return {
        "data": product_service.list_categories(db),
        "message": "Categories list",
    }


@router.get("/low-stock", response_model=Envelope[list[ProductAdminOut]], summary="Low stock")
def low_stock_products(
    admin: AdminUser,
    db: DbSession,
    threshold: int = Query(default=5, ge=0),
) -> dict:
    """List active products at or below the stock threshold."""
    rows = product_service.low_stock_products(db, threshold)
    return {
        "data": [product_service.serialize_product(row, True) for row in rows],
        "message": "Low stock products",
    }


@router.get("/{product_id}", response_model=Envelope[ProductOut], summary="Product details")
def get_product(product_id: UUID, db: DbSession, user: OptionalUser) -> dict:
    """Get a product; inactive products are 404 for non-admins."""
    is_admin = user is not None and role_of(user) == "ADMIN"
    product = product_service.get_product(db, product_id, is_admin)
    return {
        "data": product_service.serialize_product(product, is_admin),
        "message": "Product details",
    }


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=Envelope[ProductAdminOut],
    summary="Create a product",
)
def create_product(payload: ProductCreate, admin: AdminUser, db: DbSession) -> dict:
    """Create a product."""
    product = product_service.create_product(db, payload)
    return {
        "data": product_service.serialize_product(product, True),
        "message": "Product created",
    }


@router.patch(
    "/{product_id}", response_model=Envelope[ProductAdminOut], summary="Update a product"
)
def update_product(
    product_id: UUID, payload: ProductUpdate, admin: AdminUser, db: DbSession
) -> dict:
    """Patch a product including an absolute stock quantity."""
    product = product_service.update_product(db, product_id, payload)
    return {
        "data": product_service.serialize_product(product, True),
        "message": "Product updated",
    }


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Disable a product")
def disable_product(product_id: UUID, admin: AdminUser, db: DbSession) -> None:
    """Soft-delete a product."""
    product_service.disable_product(db, product_id)
