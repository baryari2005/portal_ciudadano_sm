"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Code2, FileText, KeyRound, ShieldCheck, Type, Users } from "lucide-react";
import { toast } from "sonner";

import { AdminRecordLayout, AdminRecordSectionContent } from "@/components/shared/admin-record-layout";
import { AdminFormField, adminControlClass } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SIDEBAR_CONFIG } from "@/config/sidebar.config";
import type { Permiso, PermisosGrupo, RoleUpdate } from "../../types/types";
import { useAuth } from "@/stores/auth";
import { axiosInstance } from "@/lib/axios";
import { PermissionIcon } from "../PermissionIcon";
import { RoleFormActions } from "../RoleFormActions";
import { resolveRoleCode } from "../../lib/role-code";

type EditorMode = "create" | "edit";

function modulePresentation(moduleName: string) {
  const item = SIDEBAR_CONFIG.find((entry) => entry.permission?.modulo === moduleName);
  return item ? { label: item.title, group: item.section, icon: item.icon } : {
    label: moduleName.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase()),
    group: "Otros permisos",
    icon: KeyRound,
  };
}

export function RoleEditorPage({ mode }: { mode: EditorMode }) {
  const params = useParams();
  const router = useRouter();
  const fetchMe = useAuth((state) => state.fetchMe);
  const roleId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [role, setRole] = useState<RoleUpdate | null>(null);
  const [groups, setGroups] = useState<PermisosGrupo[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [active, setActive] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    const roleRequest: Promise<RoleUpdate | null> = mode === "edit" && roleId
      ? axiosInstance.get<{ data: RoleUpdate }>(`/roles/${roleId}`).then(({ data }) => data.data)
      : Promise.resolve(null);
    const permissionsRequest: Promise<PermisosGrupo[]> = axiosInstance.get<{ data: PermisosGrupo[] }>("/permissions", { params: { grouped: true } }).then(({ data }) => data.data);
    void Promise.all([roleRequest, permissionsRequest]).then(([loadedRole, loadedPermissions]) => {
      if (!mounted) return;
      setRole(loadedRole);
      setGroups(loadedPermissions);
      if (loadedRole) {
        setCodigo(resolveRoleCode(loadedRole));
        setNombre(loadedRole.nombre);
        setDescripcion(loadedRole.descripcion ?? "");
        setActivo(loadedRole.activo);
        setSelectedIds(loadedRole.permisos.map((item) => item.permiso.id));
      }
    }).catch(() => { if (mounted) setError("No pudimos cargar los datos del rol y sus permisos."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [mode, roleId]);

  const sections = useMemo(() => [
    { id: "general", label: "Datos generales", icon: ShieldCheck },
    ...groups.map((group) => ({ id: `permission:${group.modulo}`, ...modulePresentation(group.modulo) })),
  ], [groups]);
  const selectedGroup = active.startsWith("permission:") ? groups.find((group) => group.modulo === active.slice("permission:".length)) : null;

  function toggle(permissionId: number) {
    setSelectedIds((current) => current.includes(permissionId) ? current.filter((id) => id !== permissionId) : [...current, permissionId]);
  }

  function toggleGroup(permissions: Permiso[]) {
    const ids = permissions.map((permission) => permission.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  }

  async function save() {
    const normalizedCode = codigo.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_-]+$/.test(normalizedCode)) { setError("El código debe comenzar con una letra y usar solamente minúsculas, números, guiones o guiones bajos."); setActive("general"); return; }
    if (nombre.trim().length < 2) { setError("El nombre debe tener al menos 2 caracteres."); setActive("general"); return; }
    setSaving(true);
    setError(null);
    try {
      if (mode === "create") {
        await axiosInstance.post("/roles", { codigo: normalizedCode, nombre: nombre.trim(), descripcion: descripcion.trim() || null, activo, permisoIds: selectedIds });
        toast.success("Rol creado correctamente.");
      } else {
        await axiosInstance.put(`/roles/${roleId}`, { nombre: nombre.trim(), descripcion: descripcion.trim() || null, activo });
        await axiosInstance.put(`/roles/${roleId}/permisos`, { permisoIds: selectedIds });
        await fetchMe(true);
        toast.success("Rol y permisos actualizados.");
      }
      router.push("/roles");
    } catch (caught) {
      setError(axios.isAxiosError(caught) && caught.response?.status === 409 ? "Ya existe un rol con ese código o nombre." : "No pudimos guardar el rol.");
    } finally { setSaving(false); }
  }

  return (
    <AdminRecordLayout
      title={mode === "create" ? "Nuevo rol" : "Editar rol"}
      description={mode === "create" ? "Definí los datos y permisos del nuevo rol." : `Actualizá ${role?.nombre ?? "el rol"} y sus permisos.`}
      icon={ShieldCheck}
      backHref="/roles"
      sections={sections}
      activeSection={active}
      onSectionChange={setActive}
      navigationDisabled={loading || saving}
      loading={loading}
      loadingLabel="rol y permisos"
      contentClassName="bg-white/80"
    >
      {error ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</div> : null}
      {active === "general" ? (
        <AdminRecordSectionContent title="Datos generales" description="Configurá el identificador interno, el nombre visible y el estado del rol." icon={ShieldCheck}>
          <div className="grid gap-5">
            <AdminFormField label="Código interno *" icon={Code2}><Input value={codigo} disabled={mode === "edit"} onChange={(event) => setCodigo(event.target.value.toLowerCase().replace(/\s+/g, "_"))} placeholder="Ej: admin" className={adminControlClass} /></AdminFormField>
            <AdminFormField label="Nombre visible *" icon={Type}><Input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej: Administrador" className={adminControlClass} /></AdminFormField>
            <AdminFormField label="Descripción" icon={FileText} align="start"><Textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} rows={4} className={`${adminControlClass} min-h-28`} placeholder="Describí el alcance del rol..." /></AdminFormField>
            <div className="flex h-12 items-center justify-between rounded-xl border border-[var(--brand-border)] bg-[var(--brand-control)] px-4"><span className="font-bold text-[var(--brand-ink)]">{activo ? "Activo" : "Inactivo"}</span><Switch checked={activo} onCheckedChange={setActivo} /></div>
          </div>
        </AdminRecordSectionContent>
      ) : selectedGroup ? (
        <AdminRecordSectionContent title={modulePresentation(selectedGroup.modulo).label} description="Seleccioná las acciones habilitadas para este módulo." icon={KeyRound}>
          <div className="mb-5 flex justify-end"><Button type="button" variant="outline" onClick={() => toggleGroup(selectedGroup.permisos)} className="h-12 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] px-6 font-bold text-[var(--brand-primary)]">{selectedGroup.permisos.every((permission) => selectedIds.includes(permission.id)) ? "Quitar todos" : "Seleccionar todos"}</Button></div>
          <div className="grid gap-3">
            {selectedGroup.permisos.map((permission) => <div key={permission.id} className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-control)] p-4"><div className="flex min-w-0 items-start gap-3"><PermissionIcon name={permission.icono} className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]" /><div><p className="font-extrabold text-[var(--brand-ink)]">{permission.accion}</p><p className="mt-1 text-sm text-[var(--brand-muted)]">{permission.descripcion || "Sin descripción adicional"}</p></div></div><Switch checked={selectedIds.includes(permission.id)} onCheckedChange={() => toggle(permission.id)} /></div>)}
          </div>
        </AdminRecordSectionContent>
      ) : null}
      <RoleFormActions saving={saving} onCancel={() => router.push("/roles")} onSave={save} showCancel={false} />
    </AdminRecordLayout>
  );
}
