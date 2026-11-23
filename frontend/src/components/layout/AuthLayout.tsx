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
      <aside className="hidden w-[45%] shrink-0 flex-col justify-between bg-gradient-to-br from-primary via-primary-strong to-primary px-10 py-10 text-surface lg:flex xl:px-14">
        <BrandLogo inverse showTagline />

        <div className="max-w-lg">
          <h2 className="text-4xl font-bold leading-snug text-balance xl:text-[2.75rem]">
            {UI.auth.heroTitle}
          </h2>
          <p className="mt-4 max-w-md text-base leading-8 text-surface/85">
            {UI.auth.heroDescription}
          </p>
        </div>

        <p className="text-xs text-surface/65">© {new Date().getFullYear()} PARCELPATH</p>
      </aside>

      <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 hidden rounded-card border border-border bg-surface p-4 md:block lg:hidden">
            <p className="text-base font-bold text-text">{UI.auth.heroTitle}</p>
            <p className="mt-1 text-sm leading-6 text-text-muted">{UI.auth.heroDescription}</p>
          </div>

          <div className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="lg:hidden">
                <BrandLogo showTagline />
              </div>
              <div className="ms-auto">
                <ThemeToggle />
              </div>
            </div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
