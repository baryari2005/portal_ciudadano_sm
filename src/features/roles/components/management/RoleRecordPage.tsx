"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, ClipboardCheck, DoorOpen, Edit3, FileCheck2, FileText, GraduationCap, History, KeyRound, LibraryBig, ListChecks, School, ShieldCheck, Shapes, Users, UsersRound } from "lucide-react";

import { AdminRecordLayout, AdminRecordSectionContent } from "@/components/shared/admin-record-layout";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { CatalogDetailField, CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { axiosInstance } from "@/lib/axios";
import { SIDEBAR_CONFIG } from "@/config/sidebar.config";
import type { Permiso, Role } from "../../types/types";
import type { RoleRecordSection } from "../../constants/role-record-sections";
import { PermissionIcon } from "../PermissionIcon";
import { RoleStatusBadge } from "../RoleStatusBadge";
import { resolveRoleCode } from "../../lib/role-code";

type RoleDetail = Role & { permisos?: Array<{ permiso: Permiso }> };

const moduleFallbacks = {
  legajo: { label: "Legajo", group: "Ciudadanos", icon: FileText },
  enrollment_documents: { label: "Documentos personales", group: "Ciudadanos", icon: FileCheck2 },
  activity_schedules: { label: "Horarios", group: "Actividades", icon: ClipboardCheck },
  activity_sessions: { label: "Clases", group: "Actividades", icon: ClipboardCheck },
  enrollments: { label: "Inscripciones", group: "Actividades", icon: ClipboardCheck },
  attendance: { label: "Asistencias", group: "Actividades", icon: ListChecks },
  access: { label: "Control de ingreso", group: "Recepción", icon: DoorOpen },
  notifications: { label: "Notificaciones", group: "Comunicación", icon: BellRing },
  audit_log: { label: "Auditoría", group: "Administración", icon: History },
  requirements: { label: "Requisitos", group: "Catálogos", icon: FileCheck2 },
  profesores: { label: "Profesores", group: "Recursos", icon: GraduationCap },
  establecimientos: { label: "Establecimientos", group: "Recursos", icon: School },
  actividades: { label: "Actividades", group: "Actividades", icon: LibraryBig },
  categorias_actividades: { label: "Categorías", group: "Catálogos", icon: Shapes },
  publicos_objetivo: { label: "Dirigido a", group: "Catálogos", icon: UsersRound },
  usuarios: { label: "Usuarios", group: "Ciudadanos", icon: Users },
  roles: { label: "Roles y permisos", group: "Administración", icon: ShieldCheck },
} as const;

function permissionModulePresentation(moduleName: string) {
  const sidebarItem = SIDEBAR_CONFIG.find((item) => item.permission?.modulo === moduleName);
  if (sidebarItem) return { label: sidebarItem.title, group: sidebarItem.section, icon: sidebarItem.icon };
  return moduleFallbacks[moduleName as keyof typeof moduleFallbacks] ?? {
    label: moduleName.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase()),
    group: "Otros permisos",
    icon: KeyRound,
  };
}

export function RoleRecordPage({ roleId, section }: { roleId: number; section: RoleRecordSection }) {
  const canEdit = useCan("roles", "editar");
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [active, setActive] = useState<string>(section);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const permissionGroups = useMemo(() => Object.entries((role?.permisos ?? []).reduce<Record<string, Permiso[]>>((result, item) => {
    const moduleName = item.permiso.modulo || "General";
    (result[moduleName] ??= []).push(item.permiso);
    return result;
  }, {})), [role]);
  const sections = useMemo(() => [
    { id: "overview", label: "Resumen", icon: ShieldCheck },
    ...permissionGroups.map(([moduleName]) => ({ id: `permission:${moduleName}`, ...permissionModulePresentation(moduleName) })),
  ], [permissionGroups]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(false);
    void axiosInstance.get<{ data?: RoleDetail }>(`/roles/${roleId}`)
      .then(({ data }) => { if (mounted) setRole(data.data ?? null); })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [roleId]);

  useEffect(() => {
    if (section !== "permissions" || !permissionGroups.length || active.startsWith("permission:")) return;
    setActive(`permission:${permissionGroups[0][0]}`);
  }, [active, permissionGroups, section]);

  if (loading) return <CatalogLoadingState label="información del rol" fullPage />;

  function select(next: string) {
    if (next === active) return;
    const moduleName = next.startsWith("permission:") ? next.slice("permission:".length) : null;
    window.history.pushState(null, "", moduleName ? `/roles/${roleId}/record/permissions?module=${encodeURIComponent(moduleName)}` : `/roles/${roleId}/record/overview`);
    setActive(next);
  }

  return (
    <AdminRecordLayout
      title="Ficha completa del rol"
      description={role ? `Configuración integral de ${role.nombre}` : "Información integral del rol y sus permisos."}
      icon={ShieldCheck}
      backHref="/roles"
      sections={sections}
      activeSection={active}
      onSectionChange={select}
      navigationDisabled={loading}
      loading={loading}
      loadingLabel="información del rol"
      contentClassName={active === "overview" ? "border-0 bg-transparent p-0 shadow-none sm:p-0" : undefined}
    >
      {error || (!loading && !role) ? <p>No pudimos cargar la ficha del rol.</p> : null}
      {role && active === "overview" ? <RoleOverview role={role} canEdit={canEdit} /> : null}
      {role && active.startsWith("permission:") ? <RolePermissions moduleName={permissionModulePresentation(active.slice("permission:".length)).label} permissions={permissionGroups.find(([moduleName]) => `permission:${moduleName}` === active)?.[1] ?? []} /> : null}
    </AdminRecordLayout>
  );
}

function RoleOverview({ role, canEdit }: { role: RoleDetail; canEdit: boolean }) {
  return (
    <AdminDetailPanel>
      <AdminDetailHeader
        title={role.nombre}
        leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-xl font-extrabold text-white shadow-sm">{role.nombre.slice(0, 2).toUpperCase()}</span>}
        badge={<RoleStatusBadge activo={role.activo} />}
      />
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={KeyRound} label="Código interno">{resolveRoleCode(role)}</CatalogDetailField>
        <CatalogDetailField icon={FileText} label="Descripción">{role.descripcion || "Sin descripción"}</CatalogDetailField>
        <CatalogDetailField icon={KeyRound} label="Permisos asignados">{role._count.permisos}</CatalogDetailField>
        <CatalogDetailField icon={Users} label="Usuarios asociados">{role._count.usuarios}</CatalogDetailField>
      </dl>
      {canEdit ? <AdminDetailActions><Button asChild className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"><Link href={`/roles/${role.id}/edit`}><Edit3 />Editar</Link></Button></AdminDetailActions> : null}
    </AdminDetailPanel>
  );
}

function RolePermissions({ moduleName, permissions }: { moduleName: string; permissions: Permiso[] }) {
  return (
    <AdminRecordSectionContent title={moduleName} description={`Permisos de ${moduleName} asignados a este rol.`} icon={KeyRound}>
      <div className="grid gap-3">
        {permissions.map((permission) => (
          <CatalogDetailField key={permission.id} icon={KeyRound} label={permission.accion}>
            <span className="flex items-start gap-2"><PermissionIcon name={permission.icono} className="mt-0.5 size-4 shrink-0 text-[var(--brand-secondary)]" />{permission.descripcion || "Sin descripción adicional"}</span>
          </CatalogDetailField>
        ))}
      </div>
    </AdminRecordSectionContent>
  );
}
