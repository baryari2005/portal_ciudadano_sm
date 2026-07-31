"use client";

import { Wrench } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import type { PermisosGrupo } from "../types/types";
import { PermissionIcon } from "./PermissionIcon";

type Props = {
  permisos: PermisosGrupo[];
  selectedPermisos: number[];
  onTogglePermiso: (permisoId: number) => void;
  onToggleAll: () => void;
};

export function RolePermissionsSection({
  permisos,
  selectedPermisos,
  onTogglePermiso,
  onToggleAll,
}: Props) {
  const permissionIds = permisos.flatMap((group) =>
    group.permisos.map((permission) => permission.id),
  );
  const allSelected =
    permissionIds.length > 0 &&
    permissionIds.every((permissionId) => selectedPermisos.includes(permissionId));

  return (
    <section className="rounded-[22px] border border-[#C9D9C3] bg-white/45 p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DDEED2] text-[#00522C]">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-[#003A22]">Permisos</h3>
            <p className="mt-1 text-sm font-medium text-[#5F6F68]">
              Activa las acciones que este rol puede realizar dentro del sistema.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onToggleAll}
          disabled={permissionIds.length === 0}
          className="shrink-0 border-[#C9D9C3] bg-[#F7FBF5] font-bold text-[#1D4F36] hover:bg-[#EEF6E9]"
        >
          {allSelected ? "Quitar todos" : "Activar todos"}
        </Button>
      </div>

      <div className="grid gap-4">
        {permisos.map((grupo) => (
          <div
            key={grupo.modulo}
            className="rounded-[18px] border border-[#DDE8D7] bg-[#EEF6E9] p-5"
          >
            <Label className="text-base font-extrabold text-[#003A22]">
              {grupo.modulo}
            </Label>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {grupo.permisos.map((permiso) => {
                const checked = selectedPermisos.includes(permiso.id);

                return (
                  <div
                    key={permiso.id}
                    className="flex min-h-[76px] items-center justify-between gap-4 rounded-[16px] bg-white/70 p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <PermissionIcon
                        name={permiso.icono}
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#00522C]"
                      />

                      <div className="min-w-0">
                        <Label
                          htmlFor={`permiso-${permiso.id}`}
                          className="cursor-pointer font-extrabold text-[#173C2A]"
                        >
                          {permiso.accion}
                        </Label>

                        {permiso.descripcion ? (
                          <p className="mt-1 line-clamp-2 text-sm font-medium text-[#5F6F68]">
                            {permiso.descripcion}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <Switch
                      id={`permiso-${permiso.id}`}
                      checked={checked}
                      onCheckedChange={() => onTogglePermiso(permiso.id)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
