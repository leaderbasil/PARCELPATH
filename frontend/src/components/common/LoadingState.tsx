import type { ReactNode } from "react";
import { useUI } from "@/i18n";
import { cn } from "@/utils/cn";

type LoadingVariant =
  | "cards"
  | "rows"
  | "orders"
  | "adminOrders"
  | "adminProducts"
  | "adminUsers"
  | "detail"
  | "orderDetail"
  | "tracking"
  | "dashboard"
  | "page";

interface LoadingStateProps {
  variant?: LoadingVariant;
  count?: number;
}

function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block rounded-lg", className)} />;
}

function TableShell({ minWidth, children }: { minWidth: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface shadow-card">
      <div className={cn("min-w-[36rem]", minWidth)}>{children}</div>
    </div>
  );
}

function CardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          <div className="p-3 pb-0">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </div>
          <div className="space-y-3 p-4 pt-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-4 h-6 w-24" />
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 w-full sm:w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RowsSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="hidden h-8 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

function OrdersSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="rounded-card border border-border bg-surface p-4 text-right shadow-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminOrdersSkeleton({ count }: { count: number }) {
  const columns = "grid-cols-[1.4fr_.9fr_.8fr_.8fr]";

  return (
    <TableShell minWidth="min-w-[42rem]">
      <div className={cn("grid items-center gap-4 border-b border-border bg-background px-4 py-3", columns)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={cn("grid items-center gap-4 px-4 py-4", columns)}>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </TableShell>
  );
}

function AdminProductsSkeleton({ count }: { count: number }) {
  const columns = "grid-cols-[1.8fr_.8fr_.9fr_.7fr_.6fr_.5fr_.4fr]";

  return (
    <TableShell minWidth="min-w-[58rem]">
      <div className={cn("grid items-center gap-4 border-b border-border bg-background px-4 py-3", columns)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={cn("grid items-center gap-4 px-4 py-4", columns)}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </TableShell>
  );
}

function AdminUsersSkeleton({ count }: { count: number }) {
  const columns = "grid-cols-[1.3fr_1.4fr_.8fr_.7fr_.9fr_.4fr]";

  return (
    <TableShell minWidth="min-w-[48rem]">
      <div className={cn("grid items-center gap-4 border-b border-border bg-background px-4 py-3", columns)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={cn("grid items-center gap-4 px-4 py-4", columns)}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </TableShell>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-card border border-border bg-surface p-6 shadow-card sm:grid-cols-2">
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row">
          <Skeleton className="h-12 w-full sm:w-28" />
          <Skeleton className="h-12 flex-1" />
        </div>
      </div>
    </div>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_.6fr_.6fr] gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-6 shadow-card">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

function TrackingSkeleton({ count }: { count: number }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card">
      <Skeleton className="h-5 w-36" />
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-6 w-20 rounded-full" />
        ))}
      </div>
      <ol className="mt-5 flex flex-col">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="flex gap-4 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
              {index < count - 1 ? <Skeleton className="mt-1 w-px flex-1" /> : null}
            </div>
            <div className="flex-1 space-y-2 pt-0.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
      <Skeleton className="h-48 rounded-card" />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <CardsSkeleton count={4} />
    </div>
  );
}

export function LoadingState({ variant = "cards", count }: LoadingStateProps) {
  const ui = useUI();
  let content;

  switch (variant) {
    case "rows":
      content = <RowsSkeleton count={count ?? 5} />;
      break;
    case "orders":
      content = <OrdersSkeleton count={count ?? 5} />;
      break;
    case "adminOrders":
      content = <AdminOrdersSkeleton count={count ?? 6} />;
      break;
    case "adminProducts":
      content = <AdminProductsSkeleton count={count ?? 6} />;
      break;
    case "adminUsers":
      content = <AdminUsersSkeleton count={count ?? 6} />;
      break;
    case "detail":
      content = <DetailSkeleton />;
      break;
    case "orderDetail":
      content = <OrderDetailSkeleton />;
      break;
    case "tracking":
      content = <TrackingSkeleton count={count ?? 3} />;
      break;
    case "dashboard":
      content = <DashboardSkeleton />;
      break;
    case "page":
      content = <PageSkeleton />;
      break;
    default:
      content = <CardsSkeleton count={count ?? 8} />;
  }

  return (
    <div role="status" aria-label={ui.common.loading} className="w-full">
      <span className="sr-only">{ui.common.loading}</span>
      <div aria-hidden="true">{content}</div>
    </div>
  );
}
