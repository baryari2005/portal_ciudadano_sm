"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/layout/dashboard-sidebar/Sidebar";
import { Topbar } from "@/components/layout/dashboard-topbar/Topbar";
import { IdleLogoutModal } from "@/features/auth/components/IdleLogoutModal";
import { MustChangePasswordGate } from "@/features/auth/components/MustChangePasswordGate";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { WorkspaceGuard } from "@/features/auth/components/WorkspaceGuard";
import { useIdleLogout } from "@/features/auth/hooks/useIdleLogout";
import { useAuth } from "@/stores/auth";
import { workspacePreferenceStorageKey } from "@/features/auth/libs/workspaces";
import { TeacherEstablishmentProvider } from "../hooks/useTeacherEstablishment";
import { TeacherAssignmentGate } from "./TeacherAssignmentGate";
import { TeacherMobileBottomNavigation } from "./mobile/TeacherMobileBottomNavigation";
import { TeacherMobileHeader } from "./mobile/TeacherMobileHeader";
import { useCitizenNotifications } from "@/features/notifications/hooks/useNotifications";

type Style = CSSProperties & { "--sidebar-w": string; "--topbar-h": string; "--content-pad": string };
export function TeacherShell({ children }: { children: React.ReactNode }) {
  const pathname=usePathname();
  const {items:notificationItems,meta:notificationMeta}=useCitizenNotifications({pageSize:1});
  const unreadNotifications=notificationMeta.unreadCount??notificationItems.filter((item)=>item.status==="NO_LEIDA").length;
  const logout=useAuth((state)=>state.logout); const userId=useAuth((state)=>state.user?.id); const [collapsed,setCollapsed]=useState(false);
  useEffect(()=>setCollapsed(localStorage.getItem("sidebar-collapsed")==="true"),[]);
  useEffect(()=>localStorage.setItem("sidebar-collapsed",String(collapsed)),[collapsed]);
  useEffect(()=>{if(userId)localStorage.setItem(workspacePreferenceStorageKey(userId),"teacher")},[userId]);
  const idle=useIdleLogout(logout); const style:Style={"--sidebar-w":collapsed?"84px":"274px","--topbar-h":"116px","--content-pad":"24px"};
  return <RequireAuth><MustChangePasswordGate><WorkspaceGuard workspace="teacher"><TeacherEstablishmentProvider>
    <button type="button" onClick={()=>setCollapsed(false)} className="fixed bottom-4 right-4 z-50 hidden rounded-full bg-primary p-3 text-white shadow-lg md:block lg:hidden" aria-label="Abrir menú"><Menu/></button>
    <div className="grid h-[100dvh] min-h-0 grid-cols-1 grid-rows-[calc(80px+env(safe-area-inset-top))_minmax(0,1fr)_calc(72px+env(safe-area-inset-bottom))] overflow-hidden overscroll-none bg-[var(--brand-page)] transition-all duration-300 md:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] md:grid-rows-[var(--topbar-h)_minmax(0,1fr)]" style={style}><TeacherMobileHeader unreadNotifications={unreadNotifications}/><aside className="fixed inset-y-0 left-0 z-40 hidden h-[100dvh] w-[var(--sidebar-w)] overflow-hidden md:block"><Sidebar collapsed={collapsed} experience="teacher"/></aside><header className="col-[2/3] row-[1/2] sticky top-0 z-30 hidden md:block"><Topbar collapsed={collapsed} setCollapsed={setCollapsed} experience="teacher"/></header><main className="col-[1/2] row-[2/3] min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-none bg-[var(--brand-page)] md:col-[2/3] md:row-[2/3]"><div className="min-h-full bg-[var(--brand-page)] p-0 md:p-[var(--content-pad)]"><TeacherAssignmentGate>{children}</TeacherAssignmentGate></div></main><TeacherMobileBottomNavigation pathname={pathname}/></div>
    <IdleLogoutModal open={idle.showModal} seconds={idle.seconds} onContinue={idle.continueSession} onLogout={idle.logoutNow}/>
  </TeacherEstablishmentProvider></WorkspaceGuard></MustChangePasswordGate></RequireAuth>;
}
