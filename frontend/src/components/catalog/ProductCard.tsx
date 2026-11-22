import { Link } from "react-router-dom";
import { UI } from "@/constants/ui";
import type { Product } from "@/types/domain";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/common/Button";
import { MoneyText } from "@/components/common/MoneyText";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="flex h-40 items-center justify-center bg-background text-4xl text-text-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          "◫"
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-text">{product.name}</h3>
        <p className="line-clamp-2 text-xs text-text-muted">{product.description ?? product.category ?? "—"}</p>
        <MoneyText value={product.price} className="mt-auto text-lg font-bold text-primary-strong" />
        <div className="flex items-center gap-2">
          <Button
            className="flex-1"
            disabled={!product.in_stock}
            onClick={() =>
              addItem({
                product_id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                image_url: product.image_url,
                stock_quantity:
                  "stock_quantity" in product && typeof product.stock_quantity === "number"
                    ? product.stock_quantity
                    : 0,
              })
            }
          >
            {product.in_stock ? UI.catalog.addToCart : UI.catalog.outOfStock}
          </Button>
          <Link to={`/products/${product.id}`} className="text-xs text-primary underline">
            {UI.catalog.viewDetails}
          </Link>
        </div>
      </div>
    </article>
  );
}
