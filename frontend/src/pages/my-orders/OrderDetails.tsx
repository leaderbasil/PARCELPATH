import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { MapLink } from "@/components/common/MapLink";
import { DateText } from "@/components/common/DateText";
import { BackIcon } from "@/components/common/Icons";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CourierContactButtons } from "@/components/orders/CourierContactButtons";
import { OrderNumberBadge } from "@/components/orders/OrderNumberBadge";
import { StatusActions } from "@/components/orders/StatusActions";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { statusLabel } from "@/constants/messages";
import { useUI } from "@/i18n";
import { useOrder, useTracking } from "@/hooks/useOrders";

export default function OrderDetails() {
  const ui = useUI();
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  const trackingQuery = useTracking(
    id,
    order?.status !== "DELIVERED" && order?.status !== "CANCELLED"
  );
  const [copied, setCopied] = useState(false);

  if (isLoading) return <LoadingState variant="orderDetail" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!order) return <EmptyState message={ui.orders.empty} />;

  const handleCopy = async (): Promise<void> => {
    const value = order.tracking_number;
    if (!value || typeof navigator.clipboard === "undefined") return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-none space-y-6 p-4 py-10">
      <div className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <OrderNumberBadge number={order.order_number} />
            <p className="mt-2 text-sm text-text-muted">
              <DateText value={order.created_at} />
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={order.status} />
            <MoneyText value={order.total_amount} className="text-xl font-bold text-primary-strong" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusActions order={order} isAdmin={false} />
        </div>
      </div>

      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-4 text-lg font-semibold text-text">{ui.orders.items}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-right text-text-muted">
                <th className="p-2 font-medium">{ui.catalog.name}</th>
                <th className="p-2 font-medium">{ui.orders.items}</th>
                <th className="p-2 font-medium">{ui.admin.stock}</th>
                <th className="p-2 font-medium">{ui.admin.unitPrice}</th>
                <th className="p-2 font-medium">{ui.cart.total}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.product_id} className="border-b border-border text-text">
                  <td className="p-2">{item.product_name}</td>
                  <td className="p-2 text-text-muted" dir="ltr">
                    {item.sku}
                  </td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2">
                    <MoneyText value={item.unit_price} />
                  </td>
                  <td className="p-2">
                    <MoneyText value={item.line_total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">{ui.cart.subtotal}</dt>
            <dd><MoneyText value={order.subtotal} /></dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">{ui.cart.shippingFee}</dt>
            <dd><MoneyText value={order.shipping_fee} /></dd>
          </div>
          <div className="flex justify-between gap-4 font-semibold text-primary-strong">
            <dt>{ui.cart.total}</dt>
            <dd><MoneyText value={order.total_amount} /></dd>
          </div>
        </dl>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-text">{ui.checkout.shippingInfo}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{ui.checkout.fullName}</dt>
              <dd className="text-text">{order.shipping.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{ui.checkout.phone}</dt>
              <dd className="text-text" dir="ltr">{order.shipping.phone}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{ui.checkout.city}</dt>
              <dd className="text-text">{order.shipping.city}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{ui.checkout.address}</dt>
              <dd className="text-right text-text">{order.shipping.address}</dd>
            </div>
            <div className="pt-1">
              <MapLink query={order.shipping.map_query} url={order.shipping.map_url} />
            </div>
          </dl>
        </div>
        <div className="rounded-card border border-border bg-surface p-6 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-text">{ui.orders.track}</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{ui.checkout.paymentMethod}</dt>
              <dd className="text-text">
                {order.payment_method === "COD" ? ui.checkout.cod : ui.checkout.card}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{ui.orders.status}</dt>
              <dd className="text-text">
                {order.payment_status === "PAID" ? ui.orders.paid : ui.orders.unpaid}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">{ui.orders.carrier}</dt>
              <dd className="text-text">{order.carrier ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text-muted">{ui.orders.trackingNumber}</dt>
              <dd className="text-text" dir="ltr">
                {order.tracking_number ?? "—"}
              </dd>
            </div>
          </dl>
          {order.tracking_number ? (
            <div className="mt-4">
              <button
                type="button"
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-primary-strong hover:bg-primary-soft"
                onClick={() => void handleCopy()}
              >
                {copied ? ui.orders.copied : ui.orders.copy}
              </button>
            </div>
          ) : null}
          {order.courier_phone &&
          (order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED") ? (
            <div className="mt-4 rounded-lg border border-primary-soft bg-primary-soft/40 p-3 text-sm">
              <p className="mb-2 font-medium text-text">{ui.orders.courierPhone}</p>
              <CourierContactButtons phone={order.courier_phone} />
            </div>
          ) : null}
          <p className="mt-4 text-xs text-text-muted">
            {statusLabel(order.status)}
          </p>
        </div>
      </section>

      {trackingQuery.isError ? (
        <ErrorState
          error={trackingQuery.error}
          onRetry={() => void trackingQuery.refetch()}
        />
      ) : trackingQuery.isLoading ? (
        <LoadingState variant="tracking" count={3} />
      ) : (
        <OrderTimeline
          events={trackingQuery.data?.events ?? []}
          currentStatus={trackingQuery.data?.status ?? order.status}
        />
      )}

      <Link to="/orders" className="mt-6 inline-block">
        <Button variant="secondary">
          <BackIcon className="h-4 w-4" />
          {ui.common.back}
        </Button>
      </Link>
    </main>
  );
}
