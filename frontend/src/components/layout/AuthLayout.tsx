import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { UI } from "@/constants/ui";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div dir="rtl" className="flex min-h-screen bg-background font-sans text-text">
      <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary-strong to-primary px-12 py-10 text-surface lg:flex">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-surface/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-surface/10 blur-3xl" />
        </div>

        <BrandLogo inverse showTagline className="relative" />

        <div className="relative max-w-md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-surface/70">
            PARCELPATH
          </p>
          <h2 className="text-4xl font-bold leading-snug">{UI.auth.heroTitle}</h2>
          <p className="mt-4 text-base leading-relaxed text-surface/80">{UI.auth.heroDescription}</p>
        </div>

        <p className="relative text-xs text-surface/60">© {new Date().getFullYear()} PARCELPATH</p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="absolute end-6 top-6 hidden lg:block">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <BrandLogo showTagline />
            <ThemeToggle />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
