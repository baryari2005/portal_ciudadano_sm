"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, Menu } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarNavIcon } from "./SidebarNavIcon";
import { SidebarSection } from "./SidebarSection";
import { SIDEBAR_CONFIG } from "@/config/sidebar.config";
import { useAuth } from "@/stores/auth";
import { hasPermission } from "@/features/auth/libs/permissions";

type Props = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
};

export function Sidebar({ collapsed, setCollapsed }: Props) {
  const pathname = usePathname();
  const permissions = useAuth((state) => state.user?.permisos ?? []);

  const badgeMap: Record<string, number> = {
    pendingVacation: 0,
    pendingLicenses: 0,
  };

  const visibleItems = useMemo(() => {
    return SIDEBAR_CONFIG.filter((item) => {
      if (!item.permission) {
        return true;
      }

      return hasPermission(
        permissions,
        item.permission.modulo,
        item.permission.accion
      );
    });
  }, [permissions]);

  const grouped = useMemo(() => {
    return visibleItems.reduce<Record<string, typeof visibleItems>>(
      (acc, item) => {
        if (!acc[item.section]) {
          acc[item.section] = [];
        }

        acc[item.section].push(item);
        return acc;
      },
      {}
    );
  }, [visibleItems]);

  return (
    <aside className="flex h-full flex-col bg-[#008C93] text-white transition-all duration-300">
      <div className="flex items-center justify-center py-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center rounded-md p-2 text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <Separator className="bg-white/20" />

      {Object.entries(grouped).map(([section, items]) => (
        <div key={section}>
          <SidebarSection label={section} collapsed={collapsed} />

          {items.map((item) => (
            <SidebarNavIcon
              key={item.href}
              Icon={item.icon}
              href={item.href}
              title={item.title}
              active={
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
              }
              collapsed={collapsed}
              badgeCount={item.badgeKey ? badgeMap[item.badgeKey] : undefined}
              highlight={item.badgeKey ? badgeMap[item.badgeKey] > 0 : undefined}
            />
          ))}

          <Separator className="bg-white/20" />
        </div>
      ))}

      <div className="mb-4 mt-auto">
        <SidebarNavIcon
          Icon={HelpCircle}
          title="Ayuda"
          href="/soporte"
          active={pathname === "/soporte"}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
