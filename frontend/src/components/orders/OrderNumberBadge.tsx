import { PackageIcon } from "@/components/common/Icons";
import { useUI } from "@/i18n";
import { cn } from "@/utils/cn";

interface OrderNumberBadgeProps {
  number: string;
  as?: "h1" | "span";
  className?: string;
}

export function OrderNumberBadge({ number, as = "h1", className }: OrderNumberBadgeProps) {
  const ui = useUI();
  const Tag = as;
  return (
    <Tag
      className={cn(
        "inline-flex max-w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/70 p-2 pe-4 shadow-sm ring-1 ring-surface/60 dark:ring-border/40",
        className
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-primary-strong shadow-sm">
        <PackageIcon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-text-muted">{ui.orders.number}</span>
        <bdi
          dir="ltr"
          className="block truncate text-base font-bold tracking-wide text-primary-strong"
        >
          {number}
        </bdi>
      </span>
    </Tag>
  );
}
