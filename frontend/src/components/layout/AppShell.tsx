import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Header } from "./Header";
import { AdminSidebar } from "./AdminSidebar";

export function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-background font-sans text-text">
      <div className="flex min-h-screen">
        {isAdmin ? <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} /> : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header isAdmin={isAdmin} onOpenSidebar={() => setSidebarOpen(true)} />
          <main
            className={
              isAdmin
                ? "mx-auto w-full max-w-none flex-1 p-4 md:p-6 lg:p-8"
                : "mx-auto w-full max-w-none flex-1 p-4 md:p-6"
            }
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
