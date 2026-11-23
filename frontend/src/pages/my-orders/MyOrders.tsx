import { useState } from "react";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";
import { OrderList } from "@/components/orders/OrderList";
import { STATUS_MESSAGES } from "@/constants/messages";
import { UI } from "@/constants/ui";
import { config } from "@/config";
import { useOrders } from "@/hooks/useOrders";
import type { OrderStatus } from "@/types/domain";

const statuses = Object.keys(STATUS_MESSAGES) as OrderStatus[];

export default function MyOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useOrders({
    page,
    page_size: config.pageSize,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? config.pageSize;
  const currentPage = data?.page ?? page;
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < pageCount;

  return (
    <main className="mx-auto w-full max-w-none p-4 py-10">
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-card border border-border bg-surface p-4 sm:grid-cols-3">
        <select
          aria-label={UI.orders.status}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | "");
            setPage(1);
          }}
        >
          <option value="">{UI.common.all}</option>
          {statuses.map((entry) => (
            <option key={entry} value={entry}>
              {STATUS_MESSAGES[entry].label}
            </option>
          ))}
        </select>
        <label className="text-sm text-text-muted">
          من
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          />
        </label>
        <label className="text-sm text-text-muted">
          إلى
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
          />
        </label>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className={isFetching ? "opacity-60" : undefined}>
            <OrderList orders={data?.items ?? []} />
          </div>
          <nav className="mt-6 flex items-center justify-center gap-4" aria-label="pagination">
            <Button
              variant="secondary"
              disabled={!canGoPrevious || isFetching}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            >
              {UI.common.previous}
            </Button>
            <span className="text-sm text-text-muted">
              {currentPage} / {pageCount}
            </span>
            <Button
              variant="secondary"
              disabled={!canGoNext || isFetching}
              onClick={() => setPage((previous) => previous + 1)}
            >
              {UI.common.next}
            </Button>
          </nav>
        </>
      )}
    </main>
  );
}
