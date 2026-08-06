"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/layout/user-menu/UserAvatar";
import { RECEPTION_SIDEBAR_CONFIG, SIDEBAR_CONFIG, TEACHER_SIDEBAR_CONFIG } from "@/config/sidebar.config";
import { hasPermission } from "@/features/auth/libs/permissions";
import { useAuth } from "@/stores/auth";
import { hasAdministrativeWorkspace } from "@/features/auth/libs/workspaces";
import { usePendingUsersAlert } from "@/components/layout/dashboard-topbar/usePendingUsersAlert";

import { SidebarNavIcon } from "./SidebarNavIcon";
import { SidebarSection } from "./SidebarSection";

type Props = {
  collapsed: boolean;
  experience?: "administration" | "reception" | "teacher";
};

const SIDEBAR_SECTION_ORDER = [
  "Inicio",
  "General",
  "Ciudadanos",
  "Participación",
  "Actividades",
  "Programación",
  "Personal",
  "Operación",
  "Recepción",
  "Catálogos y Configuración",
  "Administración",
  "Docencia",
  "Comunicación",
  "Mi cuenta",
];

export function Sidebar({ collapsed, experience = "administration" }: Props) {
  const pathname = usePathname();
  const user = useAuth((state) => state.user);
  const permissions = useAuth((state) => state.user?.permisos ?? []);
  const { unreadNotificationCount } = usePendingUsersAlert(experience === "administration");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const fullName =
    [user?.nombre, user?.apellido].filter(Boolean).join(" ") ||
    user?.userId ||
    "Usuario";
  const email = user?.email || "";

  const badgeMap: Record<string, number> = {
    pendingVacation: 0,
    pendingLicenses: 0,
    notifications: unreadNotificationCount,
  };

  const visibleItems = useMemo(() => {
    const items = experience === "reception" ? RECEPTION_SIDEBAR_CONFIG : experience === "teacher" ? TEACHER_SIDEBAR_CONFIG : SIDEBAR_CONFIG;
    return items.filter((item) => {
      if (item.href === "/" && !hasAdministrativeWorkspace(user)) {
        return false;
      }
      if (!item.permission) {
        return true;
      }

      return hasPermission(
        permissions,
        item.permission.modulo,
        item.permission.accion,
      );
    });
  }, [experience, permissions, user]);

  const grouped = useMemo(() => {
    return visibleItems.reduce<Record<string, typeof visibleItems>>(
      (acc, item) => {
        if (!acc[item.section]) {
          acc[item.section] = [];
        }

        acc[item.section].push(item);
        return acc;
      },
      {},
    );
  }, [visibleItems]);

  const activeSection = useMemo(
    () =>
      visibleItems.find((item) =>
        item.href === "/" || item.href === "/reception" || item.href === "/teacher"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`),
      )?.section,
    [pathname, visibleItems],
  );

  useEffect(() => {
    if (!activeSection) return;
    setOpenSections((current) => ({ ...current, [activeSection]: true }));
  }, [activeSection]);

  function isItemActive(href: string) {
    return href === "/" || href === "/reception" || href === "/teacher"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function toggleSection(section: string) {
    setOpenSections((current) => ({
      ...current,
      [section]: !(current[section] ?? section === activeSection),
    }));
  }

  return (
    <aside className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-primary text-sidebar-foreground transition-all duration-300">
      <div
        className={
          collapsed
            ? "sticky top-0 z-10 flex h-28 shrink-0 items-center justify-center px-4"
            : "sticky top-0 z-10 flex h-36 shrink-0 items-center px-7"
        }
      >
        {collapsed ? (
          <div className="flex h-12 w-12 items-center justify-center p-1">
            <Image
              src="/logoentero.png"
              alt="Más San Miguel"
              width={573}
              height={363}
              className="h-auto w-full object-contain brightness-0 invert"
              priority
            />
          </div>
        ) : (
          <div className="w-full">
            <Image
              src="/logoentero.png"
              alt="Más San Miguel"
              width={573}
              height={363}
              className="h-auto w-44 object-contain brightness-0 invert"
              priority
            />
          </div>
        )}
      </div>
      <Separator
        className={collapsed ? "mx-4 w-auto shrink-0 bg-white/15" : "mx-7 w-auto shrink-0 bg-white/15"}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-5 [scrollbar-gutter:stable]">
        {Object.entries(grouped).sort(([left], [right]) => {
          const leftIndex = SIDEBAR_SECTION_ORDER.indexOf(left);
          const rightIndex = SIDEBAR_SECTION_ORDER.indexOf(right);
          return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
        }).map(([section, items]) => {
          const sectionOpen = collapsed || (openSections[section] ?? section === activeSection);

          return (
            <div key={section}>
              <SidebarSection
                label={section}
                collapsed={collapsed}
                open={sectionOpen}
                onToggle={() => toggleSection(section)}
              />

              {sectionOpen
                ? items.map((item) => (
                    <SidebarNavIcon
                      key={item.href}
                      Icon={item.icon}
                      href={item.href}
                      title={item.title}
                      active={isItemActive(item.href)}
                      collapsed={collapsed}
                      badgeCount={item.badgeKey ? badgeMap[item.badgeKey] : undefined}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pb-5">
        <Separator className="mx-6 mb-5 bg-white/20" />

        <SidebarNavIcon
          Icon={HelpCircle}
          title="Ayuda"
          href={experience === "reception" ? "/reception/help" : experience === "teacher" ? "/teacher/help" : "/help"}
          active={pathname === (experience === "reception" ? "/reception/help" : experience === "teacher" ? "/teacher/help" : "/help")}
          collapsed={collapsed}
        />

        <Separator className="mx-6 my-5 bg-white/20" />

        <div
          className={
            collapsed
              ? "flex justify-center px-3"
              : "mx-5 flex items-center gap-3 rounded-lg px-0 py-2"
          }
        >
          <UserAvatar
            src={user?.avatarUrl ?? undefined}
            name={fullName}
            className="h-11 w-11 rounded-lg"
            imageClassName="size-full scale-125 object-cover object-center"
            fallbackBgClass="rounded-lg bg-[var(--brand-accent)]"
            textClass="font-bold text-primary"
          />

          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{fullName}</div>
              {email && (
                <div className="truncate text-xs text-white/70">{email}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
