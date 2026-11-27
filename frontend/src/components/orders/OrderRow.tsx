import { DateText } from "@/components/common/DateText";
import { EyeIcon } from "@/components/common/Icons";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CourierContactButtons } from "@/components/orders/CourierContactButtons";
import { OrderNumberBadge } from "@/components/orders/OrderNumberBadge";
import { useUI } from "@/i18n";
import type { OrderListItem, PaymentStatus } from "@/types/domain";
import { cn } from "@/utils/cn";

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
  const ui = useUI();
  const paymentLabels: Record<PaymentStatus, string> = {
    PAID: ui.orders.paid,
    UNPAID: ui.orders.unpaid,
  };
  const showCourierPhone =
    (order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED") &&
    Boolean(order.courier_phone);

  return (
    <article className="w-full rounded-card border border-border bg-surface p-4 text-right shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(order.id)}
              aria-label={`${ui.orders.details}: ${order.order_number}`}
              className="rounded-xl text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-soft"
            >
              <OrderNumberBadge
                as="span"
                number={order.order_number}
                className="transition-shadow hover:shadow-card"
              />
            </button>
          ) : (
            <OrderNumberBadge as="span" number={order.order_number} />
          )}
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
            {paymentLabels[order.payment_status]}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <div className="flex flex-wrap items-center gap-3 text-text-muted">
          <span>
            {order.items_count} {ui.orders.items}
          </span>
          {isAdmin && order.customer?.full_name ? <span>{order.customer.full_name}</span> : null}
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(order.id)}
              aria-label={ui.orders.details}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary-strong transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <EyeIcon className="h-3.5 w-3.5" />
              {ui.orders.details}
            </button>
          ) : null}
          {showCourierPhone ? (
            <div className="w-full sm:w-auto">
              <CourierContactButtons phone={order.courier_phone} />
            </div>
          ) : null}
        </div>
        <MoneyText value={order.total_amount} className="font-semibold text-text" />
      </div>
    </article>
  );
}
