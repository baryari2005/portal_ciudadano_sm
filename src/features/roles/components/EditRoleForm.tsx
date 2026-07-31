"use client";

import type { PermisosGrupo, RoleUpdate } from "../types/types";
import { AdminFormCard } from "@/components/shared/admin-patterns";
import { RoleBasicFields } from "./RoleBasicFields";
import { RoleFormActions } from "./RoleFormActions";
import { RolePermissionsSection } from "./RolePermissionsSection";
import { RoleStatusField } from "./RoleStatusField";

type Props = {
  id: string;
  role: RoleUpdate | null;
  permisos: PermisosGrupo[];
  selectedPermisos: number[];
  loading: boolean;
  saving: boolean;
  nombre: string;
  descripcion: string;
  activo: boolean;
  setNombre: (value: string) => void;
  setDescripcion: (value: string) => void;
  setActivo: (value: boolean) => void;
  togglePermiso: (permisoId: number) => void;
  toggleAllPermisos: () => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
};

export function EditRoleForm({
  permisos,
  selectedPermisos,
  saving,
  nombre,
  descripcion,
  activo,
  setNombre,
  setDescripcion,
  setActivo,
  togglePermiso,
  toggleAllPermisos,
  handleSave,
  handleCancel,
}: Props) {
  return (
    <div className="space-y-5">
      <AdminFormCard title="Datos del rol" description="Configurá el nombre, la descripción, el estado y los permisos.">
      <div className="space-y-7">
        <RoleBasicFields
          nombre={nombre}
          descripcion={descripcion}
          onNombreChange={setNombre}
          onDescripcionChange={setDescripcion}
        />

        <RoleStatusField activo={activo} onActivoChange={setActivo} />

        <RolePermissionsSection
          permisos={permisos}
          selectedPermisos={selectedPermisos}
          onTogglePermiso={togglePermiso}
          onToggleAll={toggleAllPermisos}
        />

      </div>
      </AdminFormCard>
      <RoleFormActions
        saving={saving}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </div>
  );
}
