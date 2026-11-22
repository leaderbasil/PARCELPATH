"""Product catalog and inventory service."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductListParams, ProductUpdate
from app.utils.pagination import paginate


def serialize_product(product: Product, is_admin: bool) -> dict:
    """Build the public or admin representation of a product."""
    data = {
        "id": str(product.id),
        "name": product.name,
        "sku": product.sku,
        "description": product.description,
        "category": product.category,
        "price": f"{product.price:.2f}",
        "image_url": product.image_url,
        "in_stock": product.stock_quantity > 0,
    }
    if is_admin:
        data.update(
            {
                "stock_quantity": product.stock_quantity,
                "is_active": product.is_active,
                "created_at": product.created_at,
                "updated_at": product.updated_at,
            }
        )
    return data


def escape_like(term: str) -> str:
    """Escape ILIKE wildcards so user input is matched literally."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_products(
    db: Session, params: ProductListParams, is_admin: bool
) -> tuple[list[Product], int]:
    """List catalog products; guests/customers only see active products."""
    statement = select(Product)
    if not is_admin:
        statement = statement.where(Product.is_active.is_(True))
    elif params.is_active is not None:
        statement = statement.where(Product.is_active == params.is_active)

    if params.search:
        term = f"%{escape_like(params.search)}%"
        statement = statement.where(
            or_(
                Product.name.ilike(term, escape="\\"),
                Product.sku.ilike(term, escape="\\"),
                Product.category.ilike(term, escape="\\"),
            )
        )
    if params.category:
        statement = statement.where(Product.category == params.category)
    if params.min_price is not None:
        statement = statement.where(Product.price >= params.min_price)
    if params.max_price is not None:
        statement = statement.where(Product.price <= params.max_price)

    sort_column = {
        "newest": Product.created_at.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "name": Product.name.asc(),
    }[params.sort]
    statement = statement.order_by(sort_column, Product.id)
    return paginate(db, statement, params)


def list_categories(db: Session) -> list[str]:
    """Return distinct non-empty categories of active products."""
    rows = db.execute(
        select(func.distinct(Product.category))
        .where(Product.is_active.is_(True), Product.category.is_not(None))
        .order_by(Product.category)
    ).all()
    return [row[0] for row in rows if row[0]]


def low_stock_products(db: Session, threshold: int) -> list[Product]:
    """Return active products at or below the threshold, including zero stock."""
    return list(
        db.scalars(
            select(Product)
            .where(Product.is_active.is_(True), Product.stock_quantity <= threshold)
            .order_by(Product.stock_quantity, Product.name)
        ).all()
    )


def get_product(db: Session, product_id: UUID, is_admin: bool = False) -> Product:
    """Fetch a product; inactive products are invisible to non-admins."""
    product = db.get(Product, product_id)
    if product is None or (not is_admin and not product.is_active):
        raise AppException(404, "PRODUCT_NOT_FOUND", "Product not found")
    return product


def create_product(db: Session, payload: ProductCreate) -> Product:
    """Create a product with a unique SKU."""
    if db.scalar(select(Product).where(Product.sku == payload.sku)):
        raise AppException(409, "DUPLICATE_SKU", "SKU is already in use")
    product = Product(
        name=payload.name,
        sku=payload.sku,
        description=payload.description,
        category=payload.category,
        price=payload.price,
        stock_quantity=payload.stock_quantity,
        image_url=str(payload.image_url) if payload.image_url else None,
        is_active=payload.is_active,
    )
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppException(409, "DUPLICATE_SKU", "SKU is already in use") from None
    db.refresh(product)
    return product


def update_product(db: Session, product_id: UUID, payload: ProductUpdate) -> Product:
    """Patch a product, locking the row so concurrent stock updates are safe."""
    product = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if product is None:
        raise AppException(404, "PRODUCT_NOT_FOUND", "Product not found")

    fields = payload.model_dump(exclude_unset=True)
    if "sku" in fields and fields["sku"] != product.sku:
        if db.scalar(select(Product).where(Product.sku == fields["sku"])):
            raise AppException(409, "DUPLICATE_SKU", "SKU is already in use")
    if "image_url" in fields:
        fields["image_url"] = str(fields["image_url"]) if fields["image_url"] else None

    for name, value in fields.items():
        setattr(product, name, value)
    product.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppException(409, "DUPLICATE_SKU", "SKU is already in use") from None
    db.refresh(product)
    return product


def disable_product(db: Session, product_id: UUID) -> None:
    """Soft-delete a product without touching existing orders."""
    product = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if product is None:
        raise AppException(404, "PRODUCT_NOT_FOUND", "Product not found")
    product.is_active = False
    product.updated_at = datetime.now(timezone.utc)
    db.commit()
