export type PermissionKey = string; // ej: "usuarios.ver", "roles.editar"

export type RolDTO = {
  id: number;
  nombre: string;
};

export type UserDTO = {
  id: string;
  userId: string;
  email: string;
  nombre?: string | null;
  apellido?: string | null;
  avatarUrl?: string | null;
  rol: RolDTO;
  permisos: PermissionKey[];
};

export const can = (
  perms: PermissionKey[] | undefined,
  needed: PermissionKey | PermissionKey[],
) => {
  if (!perms) return false;
  const list = Array.isArray(needed) ? needed : [needed];
  const set = new Set(perms);
  return list.some((p) => set.has(p));
};
