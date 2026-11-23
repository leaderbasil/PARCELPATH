import { PackageIcon } from "@/components/common/Icons";
import { cn } from "@/utils/cn";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
}

export function BrandLogo({ className, compact = false, showTagline = false }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
        <PackageIcon className="h-5 w-5" />
      </span>
      {compact ? null : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-bold tracking-[0.08em] text-primary-strong">PARCELPATH</span>
          {showTagline ? <span className="truncate text-[11px] text-text-muted">متجر الطلبات والتتبّع</span> : null}
        </span>
      )}
    </span>
  );
}
