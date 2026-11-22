import { DateText } from "@/components/common/DateText";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UI } from "@/constants/ui";
import type { OrderListItem, PaymentStatus } from "@/types/domain";
import { cn } from "@/utils/cn";

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  PAID: "مدفوع",
  UNPAID: "غير مدفوع",
};

const PAYMENT_CLASSES: Record<PaymentStatus, string> = {
  PAID: "bg-success-soft text-success-strong",
  UNPAID: "bg-warning-soft text-warning-strong",
};

interface OrderRowProps {
  order: OrderListItem;
  onOpen?: (id: string) => void;
  isAdmin?: boolean;
}

export function OrderRow({ order, onOpen, isAdmin = false }: OrderRowProps) {
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-text" dir="ltr">
            {order.order_number}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            <DateText value={order.created_at} />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={order.status} />
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
              PAYMENT_CLASSES[order.payment_status]
            )}
          >
            {PAYMENT_LABELS[order.payment_status]}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <div className="flex flex-wrap items-center gap-3 text-text-muted">
          <span>
            {order.items_count} {UI.orders.items}
          </span>
          {isAdmin && order.customer?.full_name ? <span>{order.customer.full_name}</span> : null}
          {onOpen ? <span className="text-primary">{UI.orders.details}</span> : null}
        </div>
        <MoneyText value={order.total_amount} className="font-semibold text-text" />
      </div>
    </>
  );

  const baseClass = "w-full rounded-card border border-border bg-surface p-4 text-right shadow-card";

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={() => onOpen(order.id)}
        className={cn(
          baseClass,
          "transition-colors hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
