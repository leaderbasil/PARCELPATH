import { PackageIcon } from "@/components/common/Icons";
import { cn } from "@/utils/cn";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
  inverse?: boolean;
}

export function BrandLogo({
  className,
  compact = false,
  showTagline = false,
  inverse = false,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          inverse ? "bg-surface/15 text-surface" : "bg-primary-soft text-primary-strong"
        )}
      >
        <PackageIcon className="h-5 w-5" />
      </span>
      {compact ? null : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "truncate text-sm font-bold tracking-[0.08em]",
              inverse ? "text-surface" : "text-primary-strong"
            )}
          >
            PARCELPATH
          </span>
          {showTagline ? (
            <span
              className={cn(
                "truncate text-[11px]",
                inverse ? "text-surface/70" : "text-text-muted"
              )}
            >
              متجر الطلبات والتتبّع
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}
