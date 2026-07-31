"use client";

import { Power } from "lucide-react";

import { AdminStatusSwitchField } from "@/components/shared/admin-patterns";

type Props = {
  activo: boolean;
  onActivoChange: (value: boolean) => void;
};

export function RoleStatusField({ activo, onActivoChange }: Props) {
  return (
    <AdminStatusSwitchField
      checked={activo}
      onCheckedChange={onActivoChange}
      icon={Power}
      activeLabel="Rol activo"
      inactiveLabel="Rol inactivo"
      activeDescription="Puede asignarse y utilizar sus permisos."
      inactiveDescription="No estará disponible para nuevas asignaciones."
    />
  );
}
