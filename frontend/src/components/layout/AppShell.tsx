import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { AdminSidebar } from "./AdminSidebar";

export function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <div dir="rtl" className="min-h-screen bg-background font-sans text-text">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-col md:flex-row">
        {isAdmin ? <AdminSidebar /> : null}
        <main className="min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
