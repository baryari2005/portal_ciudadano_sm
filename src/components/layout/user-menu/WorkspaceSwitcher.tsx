"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DoorOpen, GraduationCap, LayoutDashboard, UserRound } from "lucide-react";
import { DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getTeacherProfileClient } from "@/features/teacher/services/teacher.service";
import { hasReceptionWorkspace, hasAdministrativeWorkspace, hasTeacherPermissions, workspacePreferenceStorageKey, type WorkspaceKey } from "@/features/auth/libs/workspaces";
import { useAuth } from "@/stores/auth";
export function WorkspaceSwitcher() {
  const user = useAuth((state) => state.user), [teacherEnabled, setTeacherEnabled] = useState(false), teacherPermissions = hasTeacherPermissions(user);
  useEffect(() => { if (!teacherPermissions) { setTeacherEnabled(false); return; } void getTeacherProfileClient().then((profile) => setTeacherEnabled(profile.estado === "ACTIVO")).catch(() => setTeacherEnabled(false)); }, [user?.id, teacherPermissions]);
  if (!user) return null;
  const links: Array<{ key: WorkspaceKey; href: string; label: string; icon: typeof LayoutDashboard }> = [
    ...(hasAdministrativeWorkspace(user) ? [{ key: "administration" as const, href: "/", label: "Administración", icon: LayoutDashboard }] : []),
    ...(hasReceptionWorkspace(user) ? [{ key: "reception" as const, href: "/reception", label: "Recepción", icon: DoorOpen }] : []),
    ...(teacherEnabled && teacherPermissions ? [{ key: "teacher" as const, href: "/teacher", label: "Portal del Profesor", icon: GraduationCap }] : []),
    { key: "citizen", href: "/citizen", label: "Portal Ciudadano", icon: UserRound },
  ];
  return <><DropdownMenuLabel className="px-5 text-xs uppercase tracking-wide text-[var(--brand-secondary)]">Cambiar experiencia</DropdownMenuLabel>{links.map(({ key, href, label, icon: Icon }) => <DropdownMenuItem key={key} asChild><Link href={href} onClick={() => localStorage.setItem(workspacePreferenceStorageKey(user.id), key)} className="mx-2 cursor-pointer rounded-xl px-3 py-2"><Icon className="mr-3 size-4" />{label}</Link></DropdownMenuItem>)}</>;
}
