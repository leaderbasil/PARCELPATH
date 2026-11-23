import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { BackIcon, CartIcon } from "@/components/common/Icons";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/common/Input";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyText } from "@/components/common/MoneyText";
import { ProductImage } from "@/components/common/ProductImage";
import { UI } from "@/constants/ui";
import { useCart } from "@/context/CartContext";
import { useProduct } from "@/hooks/useProducts";
import { formatDate } from "@/utils/date";

export default function ProductDetails() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { data: product, isLoading, isError, error, refetch } = useProduct(id);
  const { addItem } = useCart();
  const [quantityInput, setQuantityInput] = useState(1);
  const [added, setAdded] = useState(false);

  if (isLoading) return <LoadingState variant="detail" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!product) return <EmptyState message="المنتج غير موجود." />;

  const stock =
    "stock_quantity" in product && typeof product.stock_quantity === "number"
      ? product.stock_quantity
      : product.in_stock
        ? 1
        : 0;
  const maxQuantity = Math.min(99, Math.max(0, stock));
  const outOfStock = !product.in_stock || maxQuantity === 0;
  const quantity = Math.min(Math.max(1, quantityInput), Math.max(1, maxQuantity));
  const createdAt = "created_at" in product ? product.created_at : null;

  const handleAddToCart = (): void => {
    if (outOfStock) return;
    addItem({
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: stock,
      quantity,
    });
    setAdded(true);
  };

  return (
    <main className="mx-auto w-full max-w-none p-4 py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-text-muted" aria-label="breadcrumb">
        <Link to="/" className="text-primary-strong underline">
          {UI.catalog.title}
        </Link>
        {product.category ? (
          <>
            <span>/</span>
            <span>{product.category}</span>
          </>
        ) : null}
        <span>/</span>
        <span className="text-text">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-6 rounded-card border border-border bg-surface p-6 shadow-card sm:grid-cols-2">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="aspect-[4/3] w-full rounded-xl border border-border"
        />
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold text-text">{product.name}</h1>
          <MoneyText value={product.price} className="text-2xl font-bold text-primary-strong" />
          <p className="text-sm text-text-muted">{product.description ?? "—"}</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-text-muted">{UI.catalog.name}</dt>
              <dd className="text-text">{product.sku}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-text-muted">{UI.catalog.categories}</dt>
              <dd className="text-text">{product.category ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-text-muted">{UI.admin.stock}</dt>
              <dd className="text-text">{outOfStock ? UI.catalog.outOfStock : stock}</dd>
            </div>
            {createdAt ? (
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <dt className="text-text-muted">{UI.orders.date}</dt>
                <dd className="text-text">{formatDate(createdAt)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-28">
              <Input
                label="الكمية"
                type="number"
                className="h-12 text-base"
                min={1}
                max={Math.max(1, maxQuantity)}
                value={quantity}
                disabled={outOfStock}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setQuantityInput(Number.isFinite(next) ? next : 1);
                }}
              />
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className="h-12 w-full text-base sm:w-auto sm:flex-1"
            >
              <CartIcon className="h-4 w-4" aria-hidden="true" />
              {outOfStock ? UI.catalog.outOfStock : UI.catalog.addToCart}
            </Button>
          </div>
          {outOfStock ? <p className="text-sm text-danger">{UI.catalog.outOfStock}</p> : null}
          {added ? (
            <p className="text-sm text-success-strong">
              تمت الإضافة إلى السلة.{" "}
              <Link to="/cart" className="text-primary-strong underline">
                {UI.nav.cart}
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <Link to="/" className="mt-6 inline-block">
        <Button variant="secondary">
          <BackIcon className="h-4 w-4" />
          {UI.common.back}
        </Button>
      </Link>
    </main>
  );
}
