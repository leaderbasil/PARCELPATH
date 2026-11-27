import { Button } from "@/components/common/Button";
import { MoneyText } from "@/components/common/MoneyText";
import { ProductImage } from "@/components/common/ProductImage";
import { useUI } from "@/i18n";
import { useCart } from "@/context/CartContext";
import type { CartItem } from "@/types/domain";
import { multiplyMoney } from "@/utils/money";

const MAX_QUANTITY = 99;

export function CartItemRow({ item }: { item: CartItem }) {
  const ui = useUI();
  const { updateQuantity, removeItem } = useCart();

  const stockLimit = item.stock_quantity > 0 ? item.stock_quantity : undefined;
  const maxQuantity = Math.min(MAX_QUANTITY, stockLimit ?? MAX_QUANTITY);
  const canDecrease = item.quantity > 1;
  const canIncrease = item.quantity < maxQuantity;

  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-card sm:flex sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <ProductImage
          src={item.image_url}
          alt={item.name}
          className="h-16 w-16 shrink-0 rounded-lg border border-border"
        />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 break-words font-semibold leading-snug text-text">
            {item.name}
          </h3>
          <p className="mt-0.5 text-xs text-text-muted" dir="ltr">
            {item.sku}
          </p>
          <MoneyText value={item.price} className="mt-1 block text-sm text-text-muted" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 sm:mt-0 sm:w-auto sm:border-0 sm:pt-0">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            aria-label="−"
            disabled={!canDecrease}
            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
            className="h-8 w-8 p-0 text-lg"
          >
            −
          </Button>
          <span className="w-8 text-center text-sm font-medium text-text" aria-live="polite">
            {item.quantity}
          </span>
          <Button
            variant="secondary"
            aria-label="+"
            disabled={!canIncrease}
            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
            className="h-8 w-8 p-0 text-lg"
          >
            +
          </Button>
        </div>

        <div className="flex min-w-[6rem] flex-col items-end gap-2">
          <MoneyText
            value={multiplyMoney(item.price, item.quantity)}
            className="font-semibold text-text"
          />
          <Button
            variant="ghost"
            onClick={() => removeItem(item.product_id)}
            className="px-2 py-1 text-xs text-danger"
          >
            {ui.cart.remove}
          </Button>
        </div>
      </div>
    </article>
  );
}
