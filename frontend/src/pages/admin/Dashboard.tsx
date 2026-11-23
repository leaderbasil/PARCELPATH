import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Input } from "@/components/common/Input";
import { LoadingState } from "@/components/common/LoadingState";
import { MoneyText } from "@/components/common/MoneyText";
import { StatusBadge } from "@/components/common/StatusBadge";
import { UI } from "@/constants/ui";
import { statusLabel } from "@/constants/messages";
import { useDashboard, useOrdersByStatus, useSales } from "@/hooks/useReports";
import { useLowStock } from "@/hooks/useProducts";
import type { OrderStatus } from "@/types/domain";
import { toDateInputValue } from "@/utils/date";

interface DateRange {
  from: string;
  to: string;
}

const STATUS_ORDER: readonly OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

function lastThirtyDays(): DateRange {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 29);
  return { from: toDateInputValue(from), to: toDateInputValue(today) };
}

function KpiCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      <p className="text-sm text-text-muted">{label}</p>
      <div className="mt-2 text-2xl font-semibold text-text">{children}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [range, setRange] = useState<DateRange>(lastThirtyDays);
  const [draft, setDraft] = useState<DateRange>(range);

  const params = {
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
  };
  const dashboard = useDashboard(params);
  const sales = useSales(params);
  const byStatus = useOrdersByStatus(params);
  const lowStock = useLowStock();

  const isLoading = dashboard.isLoading || sales.isLoading || byStatus.isLoading || lowStock.isLoading;
  const error = dashboard.error ?? sales.error ?? byStatus.error ?? lowStock.error;
  const refetchAll = () => {
    void dashboard.refetch();
    void sales.refetch();
    void byStatus.refetch();
    void lowStock.refetch();
  };

  const dailySales = (dashboard.data?.daily_sales ?? []).map((row) => ({
    date: row.date.slice(5),
    total: Number(row.total) || 0,
    count: row.count,
  }));
  const statusCounts: Readonly<Record<string, number>> = byStatus.data
    ? byStatus.data
    : { ...(dashboard.data?.orders_by_status ?? {}) };
  const statusBars = STATUS_ORDER.map((status) => ({
    label: statusLabel(status),
    count: statusCounts[status] ?? 0,
  }));
  const topProducts = dashboard.data?.top_products ?? [];
  const periodSales = sales.data?.summary.sales_total ?? dashboard.data?.period.sales_total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">{UI.admin.dashboard}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {UI.admin.dashboardDescription} · {range.from} — {range.to}
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setRange(draft);
          }}
        >
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
          <Button type="submit">{UI.common.search}</Button>
        </form>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={refetchAll} />
      ) : !dashboard.data ? (
        <EmptyState message={UI.common.noResults} />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="مؤشرات الأداء">
            <KpiCard label={UI.admin.todayOrders}>{dashboard.data.today.order_count}</KpiCard>
            <KpiCard label={UI.admin.todaySales}>
              <MoneyText value={dashboard.data.today.sales_total} />
            </KpiCard>
            <KpiCard label={UI.admin.pending}>{dashboard.data.pending_count}</KpiCard>
            <KpiCard label={UI.admin.lowStock}>{dashboard.data.low_stock_count}</KpiCard>
            <KpiCard label={UI.admin.sales}>
              {periodSales ? <MoneyText value={periodSales} /> : "—"}
            </KpiCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-4 text-base font-semibold text-text">{UI.admin.sales}</h2>
              {dailySales.length === 0 ? (
                <EmptyState message={UI.common.noResults} />
              ) : (
                <div dir="ltr" className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailySales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="var(--color-border)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--color-border)" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 8,
                        }}
                        cursor={{ fill: "var(--color-primary-soft)" }}
                      />
                      <Bar
                        dataKey="total"
                        name={UI.admin.sales}
                        fill="var(--color-primary)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-4 text-base font-semibold text-text">{UI.admin.statusDistribution}</h2>
              <div dir="ltr" className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--color-border)" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                      }}
                      cursor={{ fill: "var(--color-primary-soft)" }}
                    />
                    <Bar
                      dataKey="count"
                      name={UI.orders.status}
                      fill="var(--color-primary-strong)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-4 text-base font-semibold text-text">{UI.admin.topProducts}</h2>
              {topProducts.length === 0 ? (
                <EmptyState message={UI.common.noResults} />
              ) : (
                <ul className="divide-y divide-border">
                  {topProducts.map((product, index) => (
                    <li key={product.product_id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {index + 1}. {product.product_name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {product.sku} · {product.quantity_sold}
                        </p>
                      </div>
                      <MoneyText value={product.revenue} className="whitespace-nowrap text-sm font-medium text-text" />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <h2 className="mb-4 text-base font-semibold text-text">{UI.admin.lowStock}</h2>
              {(lowStock.data ?? []).length === 0 ? (
                <EmptyState message={UI.common.noResults} />
              ) : (
                <ul className="divide-y divide-border">
                  {(lowStock.data ?? []).map((product) => (
                    <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text">{product.name}</p>
                        <p className="text-xs text-text-muted">{product.sku}</p>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning-strong">
                        {UI.admin.stock}: {product.stock_quantity}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-text">{UI.admin.statusDistribution}</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((status) => (
                <div
                  key={status}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium text-text">{statusCounts[status] ?? 0}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
