import { Link } from "react-router-dom";
import { UI } from "@/constants/ui";
import type { Product } from "@/types/domain";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/common/Button";
import { MoneyText } from "@/components/common/MoneyText";
import { ProductImage } from "@/components/common/ProductImage";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <ProductImage src={product.image_url} alt={product.name} className="h-44 w-full" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold text-text">{product.name}</h3>
        <p className="line-clamp-2 text-xs text-text-muted">{product.description ?? product.category ?? "—"}</p>
        <MoneyText value={product.price} className="mt-auto text-lg font-bold text-primary-strong" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
          <Link to={`/products/${product.id}`}>
            <Button variant="secondary" className="w-full px-3 sm:w-auto">
              {UI.catalog.viewDetails}
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
