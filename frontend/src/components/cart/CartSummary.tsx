import { Button } from "@/components/common/Button";
import { MoneyText } from "@/components/common/MoneyText";
import { UI } from "@/constants/ui";
import { sumMoney, toSubunits } from "@/utils/money";

interface CartSummaryProps {
  subtotal: string;
  shippingFee?: string;
  total?: string;
  onCheckout?: () => void;
  checkoutLabel?: string;
}

export function CartSummary({
  subtotal,
  shippingFee = "0.00",
  total,
  onCheckout,
  checkoutLabel,
}: CartSummaryProps) {
  const finalTotal = total ?? sumMoney([subtotal, shippingFee]);
  const isEmpty = toSubunits(subtotal) === 0;

  return (
    <aside className="rounded-card border border-border bg-surface p-5 shadow-card">
      <h2 className="mb-4 text-lg font-semibold text-text">{UI.cart.title}</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-text-muted">{UI.cart.subtotal}</dt>
          <dd>
            <MoneyText value={subtotal} className="text-text" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-text-muted">{UI.cart.shippingFee}</dt>
          <dd>
            <MoneyText value={shippingFee} className="text-text" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg bg-primary-soft px-3 py-2 font-semibold">
          <dt className="text-primary-strong">{UI.cart.total}</dt>
          <dd>
            <MoneyText value={finalTotal} className="text-primary-strong" />
          </dd>
        </div>
      </dl>

      <Button className="mt-5 w-full" disabled={isEmpty || !onCheckout} onClick={onCheckout}>
        {checkoutLabel ?? UI.cart.checkout}
      </Button>
    </aside>
  );
}
