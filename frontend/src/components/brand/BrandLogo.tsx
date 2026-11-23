import { cn } from "@/utils/cn";

interface BrandLogoProps {
  className?: string;
  compact?: boolean;
  showTagline?: boolean;
  inverse?: boolean;
}

function BrandMark({ inverse }: { inverse: boolean }) {
  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-xl">
      {/* Light theme asset: white background. */}
      <img
        src="/brand/parcelpath-logo-light.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="eager"
        decoding="async"
        className={cn("h-full w-full object-cover", inverse ? "block" : "block dark:hidden")}
      />
      {/* Dark theme asset: deep-purple background. */}
      <img
        src="/brand/parcelpath-logo-dark.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        loading="eager"
        decoding="async"
        className={cn("h-full w-full object-cover", inverse ? "hidden" : "hidden dark:block")}
      />
    </span>
  );
}

export function BrandLogo({
  className,
  compact = false,
  showTagline = false,
  inverse = false,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark inverse={inverse} />
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
