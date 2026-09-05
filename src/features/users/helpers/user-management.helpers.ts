import type { ManagedUser, ManagedUserStatus } from "../types/management.types";

export const USER_STATUS_LABELS: Record<ManagedUserStatus, string> = {
  PENDIENTE: "Pendiente",
  ACTIVO: "Activo",
  RECHAZADO: "Rechazado",
  BLOQUEADO: "Bloqueado",
};

export const USER_STATUS_CLASSES: Record<ManagedUserStatus, string> = {
  PENDIENTE: "border-[#d9df75] bg-[#f5f7cf] text-primary",
  ACTIVO: "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white",
  RECHAZADO: "border-red-300 bg-red-50 text-red-700",
  BLOQUEADO: "border-zinc-300 bg-zinc-100 text-zinc-700",
};

export function getRoleClass(role: ManagedUser["role"]) {
  const normalized = role.toLowerCase();

  if (normalized.includes("admin")) {
    return "border-[#cfe5b8] bg-[#dceecb] text-primary";
  }

  if (normalized.includes("editor")) {
    return "border-blue-200 bg-blue-50 text-primary";
  }

  return "border-[#cfe5b8] bg-[#edf5e7] text-primary";
}

export function filterManagedUsers(users: ManagedUser[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return users;
  }

  return users.filter((user) => {
    return [user.userId, user.fullName, user.email, user.role, user.status]
      .join(" ")
      .toLowerCase()
      .includes(normalized);
  });
}

export function formatUserCount(count: number) {
  return `${count} ${count === 1 ? "usuario encontrado" : "usuarios encontrados"}`;
}

export function buildUserInitials(user: {
  nombre?: string | null;
  apellido?: string | null;
  userId?: string | null;
}) {
  const full = [user.nombre, user.apellido].filter(Boolean).join(" ").trim();
  const source = full || user.userId || "Usuario";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "Sin registrar";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin registrar";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
