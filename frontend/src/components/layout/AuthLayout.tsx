import { useRef, type PointerEvent, type ReactNode } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import {
  OrdersIcon,
  PackageIcon,
  SparkleIcon,
  UsersIcon,
} from "@/components/common/Icons";
import { UI } from "@/constants/ui";

interface AuthLayoutProps {
  children: ReactNode;
}

function AuthHeroTitle({ compact = false }: { compact?: boolean }) {
  const colours = compact
    ? ["text-primary-strong", "text-warning-strong", "text-success-strong"]
    : ["text-surface", "auth-title-accent", "auth-title-glow"];
  const sizes = compact
    ? "text-base font-bold leading-snug"
    : "text-4xl font-bold leading-snug text-balance xl:text-[2.75rem]";

  return (
    <h2 className={sizes}>
      <span className={colours[0]}>{UI.auth.heroTitleLead}</span>{" "}
      <span className={colours[1]}>{UI.auth.heroTitleAccent}</span>{" "}
      <span className={colours[2]}>{UI.auth.heroTitleTail}</span>
    </h2>
  );
}

function AuthHeroDescription({ compact = false }: { compact?: boolean }) {
  return (
    <p
      className={
        compact
          ? "mt-1 text-sm leading-6 text-text-muted"
          : "mt-4 max-w-md text-base leading-8 text-surface/85"
      }
    >
      {UI.auth.heroDescriptionLines.map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}

function AuthHeroCard() {
  return (
    <div className="auth-parallax relative z-10 w-full max-w-sm" aria-hidden="true">
      <div className="auth-float-card relative rounded-[1.75rem] border border-surface/25 bg-surface/10 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface/20 text-surface">
            <PackageIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-wide text-surface/70" dir="ltr">
              {UI.auth.heroCardTag}
            </p>
            <p className="text-base font-bold text-surface">{UI.auth.heroCardTitle}</p>
          </div>
          <span className="auth-pulse h-2.5 w-2.5 rounded-full bg-success-soft" />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="auth-step flex h-9 w-9 items-center justify-center rounded-xl bg-surface/20 text-surface">
            <UsersIcon className="h-4 w-4" />
          </span>
          <span className="auth-route-line h-px flex-1 bg-surface/30" />
          <span className="auth-step auth-step-delay flex h-9 w-9 items-center justify-center rounded-xl bg-surface/20 text-surface">
            <OrdersIcon className="h-4 w-4" />
          </span>
          <span className="auth-route-line auth-route-delay h-px flex-1 bg-surface/30" />
          <span className="auth-step auth-step-delay-2 flex h-9 w-9 items-center justify-center rounded-xl bg-surface/20 text-surface">
            <SparkleIcon className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-surface/80">
          <span>{UI.auth.heroCardRoute}</span>
          <span dir="rtl">{UI.auth.heroCardUpdated}</span>
        </div>
      </div>
    </div>
  );
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const asideRef = useRef<HTMLElement>(null);

  const handlePointerMove = (event: PointerEvent<HTMLElement>): void => {
    const panel = asideRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    panel.style.setProperty("--pointer-x", `${(x * 14).toFixed(1)}px`);
    panel.style.setProperty("--pointer-y", `${(y * 10).toFixed(1)}px`);
  };

  const handlePointerLeave = (): void => {
    const panel = asideRef.current;
    if (!panel) return;
    panel.style.setProperty("--pointer-x", "0px");
    panel.style.setProperty("--pointer-y", "0px");
  };

  return (
    <div dir="rtl" className="flex min-h-screen bg-background font-sans text-text">
      <aside
        ref={asideRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="auth-panel relative hidden w-[45%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary-strong to-primary px-10 py-10 text-surface lg:flex xl:px-14"
      >
        <span className="auth-glow" aria-hidden="true" />

        <div className="auth-rise relative z-10">
          <BrandLogo inverse showTagline />
        </div>

        <div className="flex flex-1 flex-col justify-center gap-10 py-8">
          <div className="auth-rise auth-rise-delay-1 relative z-10 max-w-lg">
            <AuthHeroTitle />
            <AuthHeroDescription />
          </div>
          <div className="auth-rise auth-rise-delay-2 relative flex justify-start">
            <AuthHeroCard />
          </div>
        </div>

        <p className="auth-rise auth-rise-delay-2 relative z-10 text-xs text-surface/65">
          © {new Date().getFullYear()} PARCELPATH
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 hidden rounded-card border border-border bg-surface p-4 md:block lg:hidden">
            <AuthHeroTitle compact />
            <AuthHeroDescription compact />
          </div>

          <div className="relative rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
            <div className="absolute end-4 top-4 sm:end-6 sm:top-6">
              <ThemeToggle />
            </div>
            <div className="mb-6 flex justify-center lg:mb-8">
              <BrandLogo
                compact
                markClassName="h-20 w-20 rounded-3xl lg:h-24 lg:w-24 lg:rounded-[1.75rem]"
              />
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
