"use client";

import { useState, useEffect } from "react";
import type { ReactNode, CSSProperties } from "react";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MustChangePasswordGate } from "@/features/auth/components/MustChangePasswordGate";
import { useIdleLogout } from "@/features/auth/hooks/useIdleLogout";
import { IdleLogoutModal } from "@/features/auth/components/IdleLogoutModal";
import { Sidebar } from "@/components/layout/dashboard-sidebar/Sidebar";
import { Menu } from "lucide-react";
import { Topbar } from "@/components/layout/dashboard-topbar/Topbar";
import { WorkspaceGuard } from "@/features/auth/components/WorkspaceGuard";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

type DashboardLayoutStyle = CSSProperties & {
  "--sidebar-w": string;
  "--topbar-h": string;
  "--content-pad": string;
};

export default function DashboardRootLayout({ children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const idle = useIdleLogout(logout);

  const layoutStyle: DashboardLayoutStyle = {
    "--sidebar-w": collapsed ? "84px" : "274px",
    "--topbar-h": "116px",
    "--content-pad": "24px",
    gridTemplateColumns: "var(--sidebar-w) 1fr",
    gridTemplateRows: "var(--topbar-h) 1fr",
  };

  return (
    <RequireAuth>
      <MustChangePasswordGate>
        <WorkspaceGuard workspace={pathname.startsWith("/access") || pathname === "/validar-qr" || pathname === "/busqueda-manual" ? "access" : "administration"}>
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setCollapsed(false)}
            className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg"
          >
            <Menu />
          </button>
        </div>

        <div
          className="grid h-[100dvh] min-h-0 overflow-hidden bg-[#FBFBFB] transition-all duration-300"
          style={layoutStyle}
        >
          <aside className="fixed inset-y-0 left-0 z-40 h-[100dvh] min-h-0 w-[var(--sidebar-w)] overflow-hidden transition-[width] duration-300">
            <Sidebar collapsed={collapsed} />
          </aside>

          <header className="col-[2/3] row-[1/2] sticky top-0 z-30">
            <Topbar collapsed={collapsed} setCollapsed={setCollapsed} />
          </header>

          <main className="col-[2/3] row-[2/3] min-h-0 min-w-0 overflow-y-auto overscroll-contain transition-all duration-300">
            <div className="p-[var(--content-pad)]">{children}</div>
          </main>
        </div>

        <IdleLogoutModal
          open={idle.showModal}
          seconds={idle.seconds}
          onContinue={idle.continueSession}
          onLogout={idle.logoutNow}
        />
        </WorkspaceGuard>
      </MustChangePasswordGate>
    </RequireAuth>
  );
}
