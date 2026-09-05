"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CircleHelp,
  Menu,
} from "lucide-react";

import { SidebarNavIcon } from "@/components/layout/dashboard-sidebar/SidebarNavIcon";
import { SidebarSection } from "@/components/layout/dashboard-sidebar/SidebarSection";
import { UserAvatar } from "@/components/layout/user-menu/UserAvatar";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MustChangePasswordGate } from "@/features/auth/components/MustChangePasswordGate";
import { WorkspaceGuard } from "@/features/auth/components/WorkspaceGuard";
import { IdleLogoutModal } from "@/features/auth/components/IdleLogoutModal";
import { useIdleLogout } from "@/features/auth/hooks/useIdleLogout";
import { useCitizenNotifications } from "@/features/notifications/hooks/useNotifications";
import { useAuth } from "@/stores/auth";
import { useServerClock } from "@/components/layout/dashboard-topbar/useServerClock";
import { ExperienceBar } from "@/components/layout/ExperienceBar";
import { CITIZEN_NAVIGATION, isCitizenPathActive } from "../constants/citizen-navigation";
import { CitizenMobileBottomNavigation } from "./mobile/CitizenMobileBottomNavigation";
import { CitizenMobileHeader } from "./mobile/CitizenMobileHeader";

const NOTIFICATIONS_REFRESH_INTERVAL_MS = 60_000;

type CitizenLayoutStyle = CSSProperties & {
  "--sidebar-w": string;
  "--topbar-h": string;
  "--content-pad": string;
  "--citizen-mobile-header-h": string;
  "--citizen-mobile-nav-h": string;
};

export function CitizenShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const user = useAuth((state) => state.user);
  const logout = useAuth((state) => state.logout);
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const serverClock = useServerClock();
  const { items, meta, refresh } = useCitizenNotifications({ pageSize: 5 });
  const unread = meta.unreadCount ?? items.filter((item) => item.status === "NO_LEIDA").length;

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void refresh().catch(() => undefined);
      }
    };

    const intervalId = window.setInterval(
      refreshWhenVisible,
      NOTIFICATIONS_REFRESH_INTERVAL_MS,
    );
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  const idle = useIdleLogout(logout);
  const fullName =
    [user?.nombre, user?.apellido].filter(Boolean).join(" ") ||
    user?.userId ||
    "Ciudadano";

  const groupedNavigation = useMemo(
    () =>
      CITIZEN_NAVIGATION.reduce<Record<string, typeof CITIZEN_NAVIGATION[number][]>>(
        (groups, item) => {
          (groups[item.section] ??= []).push(item);
          return groups;
        },
        {},
      ),
    [],
  );

  const activeSection = useMemo(
    () => CITIZEN_NAVIGATION.find((item) => isCitizenPathActive(pathname, item.href))?.section,
    [pathname],
  );

  useEffect(() => {
    if (!activeSection) return;
    setOpenSections((current) => ({ ...current, [activeSection]: true }));
  }, [activeSection]);

  function toggleSection(section: string) {
    setOpenSections((current) => ({
      ...current,
      [section]: !(current[section] ?? section === activeSection),
    }));
  }

  const layoutStyle: CitizenLayoutStyle = {
    "--sidebar-w": collapsed ? "84px" : "274px",
    "--topbar-h": "116px",
    "--content-pad": "24px",
    "--citizen-mobile-header-h": "calc(80px + env(safe-area-inset-top))",
    "--citizen-mobile-nav-h": "calc(72px + env(safe-area-inset-bottom))",
  };

  return (
    <RequireAuth>
      <MustChangePasswordGate>
        <WorkspaceGuard workspace="citizen">
        <div
          className="grid h-[100dvh] min-h-0 grid-cols-1 grid-rows-[var(--citizen-mobile-header-h)_minmax(0,1fr)_var(--citizen-mobile-nav-h)] overflow-hidden overscroll-none bg-[var(--brand-page)] transition-all duration-300 lg:grid-cols-[var(--sidebar-w)_minmax(0,1fr)] lg:grid-rows-[var(--topbar-h)_minmax(0,1fr)]"
          style={layoutStyle}
        >
          <CitizenMobileHeader unreadNotifications={unread} />

          <aside
            className="fixed inset-y-0 left-0 z-50 hidden h-[100dvh] min-h-0 overflow-hidden lg:relative lg:z-40 lg:col-[1/2] lg:row-[1/3] lg:block"
          >
            <div className="flex h-full flex-col bg-primary text-white">
              <div
                className={
                  collapsed
                    ? "flex h-[var(--topbar-h)] shrink-0 items-center justify-center px-4"
                    : "flex h-[var(--topbar-h)] shrink-0 items-center px-7"
                }
              >
                <Link href="/citizen" className={collapsed ? "w-12" : "w-36"}>
                  <Image
                    src="/logoentero.png"
                    alt="Más San Miguel"
                    width={573}
                    height={363}
                    className="h-auto w-full object-contain brightness-0 invert"
                    priority
                  />
                </Link>
              </div>

              <Separator
                className={collapsed ? "mx-4 w-auto shrink-0 bg-white/15" : "mx-7 w-auto shrink-0 bg-white/15"}
              />

              <div className="sidebar-brand-scrollbar min-h-0 flex-1 overflow-y-auto pb-5 [scrollbar-gutter:stable]">
                {Object.entries(groupedNavigation).map(([section, links]) => {
                  const sectionOpen = collapsed || (openSections[section] ?? section === activeSection);
                  return (
                    <div key={section}>
                      <SidebarSection
                        label={section}
                        collapsed={collapsed}
                        open={sectionOpen}
                        onToggle={() => toggleSection(section)}
                      />
                      {sectionOpen ? links.map(({ href, label, icon }) => (
                        <SidebarNavIcon
                          key={href}
                          Icon={icon}
                          href={href}
                          title={label}
                          active={isCitizenPathActive(pathname, href)}
                          collapsed={collapsed}
                          badgeCount={href === "/citizen/notifications" ? unread : undefined}
                        />
                      )) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto pb-5">
                <Separator className="mx-6 mb-5 bg-white/20" />
                <SidebarNavIcon
                  Icon={CircleHelp}
                  href="/citizen/help"
                  title="Ayuda"
                  active={isCitizenPathActive(pathname, "/citizen/help")}
                  collapsed={collapsed}
                />
                <Separator className="mx-6 my-5 bg-white/20" />
                <div className={collapsed ? "flex justify-center px-3" : "mx-5 flex items-center gap-3 py-2"}>
                  <UserAvatar
                    src={user?.avatarUrl ?? undefined}
                    name={fullName}
                    className="h-11 w-11 rounded-lg"
                    imageClassName="size-full scale-125 object-cover object-center"
                    fallbackBgClass="rounded-lg bg-[var(--brand-accent)]"
                    textClass="font-bold text-primary"
                  />
                  {!collapsed ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{fullName}</p>
                      {user?.email ? <p className="truncate text-xs text-white/70">{user.email}</p> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <header className="z-30 hidden lg:col-[2/3] lg:row-[1/2] lg:block">
            <div className="flex h-[var(--topbar-h)] flex-col border-l border-white/15 bg-primary text-white">
            <div className="flex min-h-0 flex-1 items-center justify-between px-4 sm:px-[var(--content-pad)]">
              <div className="flex min-w-0 items-center gap-3 sm:gap-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[52px] w-[52px] rounded-lg text-white hover:bg-[var(--brand-accent)] hover:text-primary sm:h-[60px] sm:w-[60px]"
                  onClick={() => setCollapsed((value) => !value)}
                  aria-label="Alternar menú de navegación"
                >
                  <Menu className="!h-8 !w-8" />
                </Button>
                <div className="min-w-0 py-1">
                  <h1 className="truncate text-lg font-bold leading-6 text-white sm:text-xl">Portal ciudadano</h1>
                  <div className="hidden text-base leading-5 text-[var(--brand-accent)] sm:block">
                    <p>Sistema de Ayuda</p>
                    <p>y Actividades</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden min-w-0 text-right lg:block">
                  <p className="truncate text-sm font-bold text-white">Hola, {fullName}</p>
                  <div className="mt-0.5 flex items-center justify-end gap-2 text-xs font-semibold text-[var(--brand-accent)]">
                    <CalendarClock className="h-4 w-4" />
                    <span className="whitespace-nowrap">{serverClock.label}</span>
                  </div>
                </div>

                <Popover onOpenChange={(open) => open && void refresh()}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="relative h-11 w-11 rounded-lg bg-[#e9f3d8] text-primary hover:bg-[var(--brand-accent)] hover:text-primary"
                      aria-label={unread ? `${unread} notificaciones sin leer` : "Notificaciones"}
                    >
                      <Bell className="h-5 w-5" />
                      {unread ? (
                        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-primary bg-[var(--brand-accent)] px-1 text-[11px] font-extrabold text-primary">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      ) : null}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-[var(--brand-border)] p-4">
                    <p className="font-extrabold text-primary">Notificaciones</p>
                    <div className="mt-3 grid gap-2">
                      {items.length ? items.slice(0, 5).map((item) => (
                        <Link key={item.id} href={item.actionUrl || "/citizen/notifications"} className="rounded-xl bg-[var(--brand-page)] p-3 text-sm hover:bg-[var(--brand-panel)]">
                          <span className="font-bold text-primary">{item.title}</span>
                          <span className="line-clamp-2 block text-[var(--brand-muted)]">{item.message}</span>
                        </Link>
                      )) : <p className="py-3 text-sm text-[var(--brand-muted)]">No tenés notificaciones.</p>}
                    </div>
                    <Button asChild variant="link" className="mt-2 h-auto px-0 text-primary">
                      <Link href="/citizen/notifications">Ver todas ({meta.total})</Link>
                    </Button>
                  </PopoverContent>
                </Popover>
                <UserMenu />
              </div>
            </div>
            <ExperienceBar experience="citizen" className="px-4 sm:px-[var(--content-pad)]" />
            </div>
          </header>

          <main className="col-[1/2] row-[2/3] min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-none bg-[var(--brand-page)] lg:col-[2/3] lg:row-[2/3]">
            <div className="min-h-full min-w-0 bg-[var(--brand-page)] p-0 lg:p-[var(--content-pad)]">{children}</div>
          </main>

          <CitizenMobileBottomNavigation pathname={pathname} />
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
