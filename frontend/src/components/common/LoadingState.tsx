import { UI } from "@/constants/ui";
import { cn } from "@/utils/cn";

type LoadingVariant = "cards" | "rows" | "detail" | "dashboard" | "page";

interface LoadingStateProps {
  variant?: LoadingVariant;
  count?: number;
}

function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block rounded-lg", className)} />;
}

function CardsSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-card border border-border bg-surface shadow-card"
        >
          <Skeleton className="h-44 w-full rounded-none" />
          <div className="space-y-3 p-4">
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

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 rounded-card border border-border bg-surface p-6 shadow-card sm:grid-cols-2">
      <Skeleton className="h-72 w-full rounded-xl" />
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
  let content;

  switch (variant) {
    case "rows":
      content = <RowsSkeleton count={count ?? 5} />;
      break;
    case "detail":
      content = <DetailSkeleton />;
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
    <div role="status" aria-label={UI.common.loading} className="w-full">
      <span className="sr-only">{UI.common.loading}</span>
      {content}
    </div>
  );
}
