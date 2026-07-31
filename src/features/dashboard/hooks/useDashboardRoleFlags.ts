"use client";

type UserLike = {
  rol?: {
    id?: number | string | null;
    nombre?: string | null;
  } | null;
};

const EMPLOYEE_ROLE_ID = 1;
const ADMIN_ROLE_IDS = new Set<number>([2, 4]);

export function useDashboardRoleFlags(user?: UserLike | null) {
  const roleId = Number(user?.rol?.id ?? 0);
  const roleName = (user?.rol?.nombre ?? "").trim().toUpperCase();

  const isEmployee = roleId === EMPLOYEE_ROLE_ID || roleName === "USUARIO";
  const isAdmin =
    ADMIN_ROLE_IDS.has(roleId) ||
    ["ADMIN", "RRHH", "ADMINISTRADOR"].includes(roleName);

  return {
    roleId,
    roleName,
    isEmployee,
    isAdmin,
  };
}
