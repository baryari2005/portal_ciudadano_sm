import type { PermissionDTO } from "@/features/auth/types/auth.types";
import type { PermissionKey } from "@/lib/rbac";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isPermission(value: unknown): value is PermissionDTO {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return typeof record.modulo === "string" && typeof record.accion === "string";
}

export function getPermissions(value: unknown): PermissionDTO[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPermission);
}

export function hasPermission(
  permissions: PermissionDTO[],
  modulo: string,
  accion: string,
) {
  const moduloNormalized = normalize(modulo);
  const accionNormalized = normalize(accion);

  return permissions.some(
    (permission) =>
      normalize(permission.modulo) === moduloNormalized &&
      normalize(permission.accion) === accionNormalized,
  );
}

export function toPermissionKeys(
  permissions: PermissionDTO[],
): PermissionKey[] {
  return permissions.map(
    (permission) =>
      `${permission.modulo}:${permission.accion}` as PermissionKey,
  );
}
