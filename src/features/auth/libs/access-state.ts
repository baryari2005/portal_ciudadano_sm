type AccessUser = {
  perfilCompleto?: boolean | null;
  estado?: "PENDIENTE" | "ACTIVO" | "RECHAZADO" | "BLOQUEADO" | string | null;
};

export type AuthAccessStatus =
  "PROFILE_INCOMPLETE" | "PENDING" | "REJECTED" | "BLOCKED";

export const AUTH_STATUS_REDIRECTS: Record<AuthAccessStatus, string> = {
  PROFILE_INCOMPLETE: "/completar-perfil",
  PENDING: "/request-access/status",
  REJECTED: "/request-access/status",
  BLOCKED: "/cuenta-bloqueada",
};

export function getUserAccessStatus(user: AccessUser): AuthAccessStatus | null {
  if (!user.perfilCompleto) {
    return "PROFILE_INCOMPLETE";
  }

  if (user.estado === "PENDIENTE") {
    return "PENDING";
  }

  if (user.estado === "RECHAZADO") {
    return "REJECTED";
  }

  if (user.estado === "BLOQUEADO") {
    return "BLOCKED";
  }

  return null;
}

export function getUserAccessRedirect(user: AccessUser) {
  const status = getUserAccessStatus(user);
  return status ? AUTH_STATUS_REDIRECTS[status] : null;
}
