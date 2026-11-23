import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/common/Input";
import { LoadingState } from "@/components/common/LoadingState";
import { OrderList } from "@/components/orders/OrderList";
import { config } from "@/config";
import { UI } from "@/constants/ui";
import { statusLabel } from "@/constants/messages";
import { useOrders } from "@/hooks/useOrders";
import type { OrderStatus } from "@/types/domain";

interface OrderFilters {
  status: OrderStatus | "";
  orderNumber: string;
  from: string;
  to: string;
}

const STATUS_OPTIONS: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const EMPTY_FILTERS: OrderFilters = { status: "", orderNumber: "", from: "", to: "" };

function parseStatus(value: string): OrderStatus | "" {
  return STATUS_OPTIONS.find((status) => status === value) ?? "";
}

export default function AdminOrders() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [draft, setDraft] = useState<OrderFilters>(EMPTY_FILTERS);

  const orders = useOrders({
    page,
    page_size: config.pageSize,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.orderNumber.trim() ? { order_number: filters.orderNumber.trim() } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
  });

  const totalPages = Math.max(1, Math.ceil((orders.data?.total ?? 0) / config.pageSize));
  const applyFilters = () => {
    setPage(1);
    setFilters(draft);
  };

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
      >
        <div className="w-full">
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-text">
            {UI.orders.status}
          </label>
          <select
            id="status"
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: parseStatus(event.target.value) }))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft"
          >
            <option value="">{UI.common.all}</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <Input
          name="orderNumber"
          label={UI.orders.number}
          value={draft.orderNumber}
          onChange={(event) => setDraft((current) => ({ ...current, orderNumber: event.target.value }))}
        />
        <Input
          type="date"
          name="from"
          label="من"
          value={draft.from}
          max={draft.to || undefined}
          onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
        />
        <Input
          type="date"
          name="to"
          label="إلى"
          value={draft.to}
          min={draft.from || undefined}
          onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
        />
        <div className="flex items-end gap-2">
          <Button type="submit">{UI.common.search}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDraft(EMPTY_FILTERS);
              setFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          >
            {UI.common.cancel}
          </Button>
        </div>
      </form>

      {orders.isLoading ? (
        <LoadingState />
      ) : orders.error ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : !orders.data || orders.data.items.length === 0 ? (
        <EmptyState message={UI.common.noResults} />
      ) : (
        <OrderList
          orders={orders.data.items}
          isAdmin
          onOpen={(id: string) => navigate(`/admin/orders/${id}`)}
        />
      )}

      {orders.data && orders.data.total > 0 ? (
        <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface px-4 py-3 shadow-card">
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {UI.common.previous}
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {UI.common.next}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
