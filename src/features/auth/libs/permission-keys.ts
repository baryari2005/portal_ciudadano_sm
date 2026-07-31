import { PermissionKey } from "@/lib/rbac";

type PermissionDTO = {
  modulo?: string;
  accion?: string;
};

export function toPermissionKeys(permisos: PermissionDTO[]): PermissionKey[] {
  return permisos
    .filter(
      (permission): permission is { modulo: string; accion: string } =>
        typeof permission?.modulo === "string" &&
        typeof permission?.accion === "string",
    )
    .map(
      (permission) =>
        `${permission.modulo}:${permission.accion}` as PermissionKey,
    );
}
