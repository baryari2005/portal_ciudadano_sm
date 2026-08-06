"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/dashboard-sidebar/Sidebar";
import { Topbar } from "@/components/layout/dashboard-topbar/Topbar";
import { IdleLogoutModal } from "@/features/auth/components/IdleLogoutModal";
import { MustChangePasswordGate } from "@/features/auth/components/MustChangePasswordGate";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { WorkspaceGuard } from "@/features/auth/components/WorkspaceGuard";
import { useIdleLogout } from "@/features/auth/hooks/useIdleLogout";
import { useAuth } from "@/stores/auth";
import { WorkspaceEstablishmentProvider } from "@/features/workspace-establishment/WorkspaceEstablishmentProvider";

type LayoutStyle = CSSProperties & { "--sidebar-w": string; "--topbar-h": string; "--content-pad": string };

export function ReceptionShell({ children }: { children: ReactNode }) {
  const logout = useAuth((state) => state.logout);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(localStorage.getItem("sidebar-collapsed") === "true"), []);
  useEffect(() => localStorage.setItem("sidebar-collapsed", String(collapsed)), [collapsed]);
  const idle = useIdleLogout(logout);
  const style: LayoutStyle = {
    "--sidebar-w": collapsed ? "84px" : "274px",
    "--topbar-h": "116px",
    "--content-pad": "24px",
    gridTemplateColumns: "var(--sidebar-w) minmax(0, 1fr)",
    gridTemplateRows: "var(--topbar-h) minmax(0, 1fr)",
  };

  return <RequireAuth><MustChangePasswordGate><WorkspaceGuard workspace="reception"><WorkspaceEstablishmentProvider workspace="reception">
    <button type="button" onClick={() => setCollapsed(false)} className="fixed bottom-4 right-4 z-50 rounded-full bg-primary p-3 text-white shadow-lg lg:hidden" aria-label="Abrir menú"><Menu /></button>
    <div className="grid h-[100dvh] min-h-0 overflow-hidden bg-[#FBFBFB] transition-all duration-300" style={style}>
      <aside className="fixed inset-y-0 left-0 z-40 h-[100dvh] w-[var(--sidebar-w)] overflow-hidden transition-[width] duration-300"><Sidebar collapsed={collapsed} experience="reception" /></aside>
      <header className="col-[2/3] row-[1/2] sticky top-0 z-30"><Topbar collapsed={collapsed} setCollapsed={setCollapsed} experience="reception" /></header>
      <main className="col-[2/3] row-[2/3] min-h-0 min-w-0 overflow-y-auto overscroll-contain"><div className="p-[var(--content-pad)]">{children}</div></main>
    </div>
    <IdleLogoutModal open={idle.showModal} seconds={idle.seconds} onContinue={idle.continueSession} onLogout={idle.logoutNow} />
  </WorkspaceEstablishmentProvider></WorkspaceGuard></MustChangePasswordGate></RequireAuth>;
}
