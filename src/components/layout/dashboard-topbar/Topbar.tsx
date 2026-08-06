"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import { Bell, CalendarClock, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserMenu } from "@/components/layout/user-menu";
import { ExperienceBar } from "@/components/layout/ExperienceBar";
import { useAuth } from "@/stores/auth";
import { usePendingUsersAlert } from "./usePendingUsersAlert";
import { useServerClock } from "./useServerClock";
import { WorkspaceEstablishmentSelector } from "@/features/workspace-establishment/WorkspaceEstablishmentSelector";

type TopbarProps = {
  collapsed: boolean;
  setCollapsed: Dispatch<SetStateAction<boolean>>;
  experience?: "administration" | "reception" | "teacher";
};

export function Topbar({ collapsed, setCollapsed, experience = "administration" }: TopbarProps) {
  const serverClock = useServerClock();
  const { notificationItems, totalActions } = usePendingUsersAlert(experience === "administration");
  const user = useAuth((state) => state.user);
  const displayName =
    [user?.nombre, user?.apellido].filter(Boolean).join(" ") ||
    user?.userId ||
    (experience === "reception" ? "Recepción" : experience === "teacher" ? "Profesor" : "Administrador");

  return (
    <header className="flex h-[var(--topbar-h)] w-full flex-col border-l border-white/15 bg-primary text-white">
      <div className="flex min-h-0 flex-1 items-center justify-between px-[var(--content-pad)]">
      <div className="flex min-w-0 items-center gap-5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[60px] w-[60px] rounded-lg text-white hover:bg-[var(--brand-accent)] hover:text-primary"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={
            collapsed ? "Mostrar iconos y texto" : "Mostrar solo iconos"
          }
          aria-pressed={collapsed}
        >
          <Menu className="!h-8 !w-8" />
        </Button>

        <div className="min-w-0 py-1">
          <h1 className="truncate text-xl font-bold leading-6 text-white">
            {experience === "reception" ? "Portal de Recepción" : experience === "teacher" ? "Portal del Profesor" : "Portal ciudadano"}
          </h1>
          <div className="text-base  leading-5 text-[var(--brand-accent)]">
            <p className="truncate">Sistema de Ayuda</p>
            <p className="truncate">y Actividades</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {experience === "teacher" || experience === "reception" ? <WorkspaceEstablishmentSelector /> : null}
        <div className="hidden min-w-0 text-right lg:block">
          <p className="truncate text-sm font-bold text-white">
            Hola, {displayName}
          </p>
          <div className="mt-0.5 flex items-center justify-end gap-2 text-xs font-semibold text-[var(--brand-accent)]">
            <CalendarClock className="h-4 w-4 shrink-0 text-[var(--brand-accent)]" />
            <span className="whitespace-nowrap">{serverClock.label}</span>
          </div>
        </div>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-lg bg-[#e9f3d8] text-primary hover:bg-[var(--brand-accent)] hover:text-primary"
              >
                <Link
                  href={experience === "reception" ? "/reception/notifications" : experience === "teacher" ? "/teacher/notifications" : "/notifications"}
                  aria-label={
                    totalActions > 0
                      ? `${totalActions} notificaciones o acciones pendientes`
                      : "Notificaciones"
                  }
                >
                  <Bell className="h-5 w-5" />
                  {totalActions > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-primary bg-[var(--brand-accent)] px-1 text-[11px] font-extrabold leading-none text-primary">
                      {totalActions > 9 ? "9+" : totalActions}
                    </span>
                  ) : null}
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              align="end"
              className="rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-[var(--brand-ink)] shadow-lg"
            >
              <div className="grid gap-1">
                <p className="text-xs font-extrabold uppercase tracking-normal text-[var(--brand-heading)]">
                  Notificaciones
                </p>
                {notificationItems.length > 0 ? (
                  notificationItems.map((item) => (
                    <p key={item.key} className="text-sm font-medium">
                      {item.label}
                    </p>
                  ))
                ) : (
                  <p className="text-sm font-medium">Sin acciones pendientes</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <UserMenu />
      </div>
      </div>
      <ExperienceBar experience={experience} />
    </header>
  );
}
