import { Prisma } from "@prisma/client";

const sortWhitelist = new Set([
  "userId",
  "email",
  "nombre",
  "apellido",
  "createdAt",
]);

type SortDir = "asc" | "desc";

export function parseUserListParams(url: string) {
  const { searchParams } = new URL(url);

  const q = (searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)),
  );

  const rawSortBy = searchParams.get("sortBy") || "";
  const sortBy = sortWhitelist.has(rawSortBy) ? rawSortBy : "createdAt";

  const sortDir: SortDir =
    (searchParams.get("sortDir") || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const estado = searchParams.get("estado") || "";
  const rolId = searchParams.get("rolId") || "";
  const scope: "all" | "citizen" | "personnel" = searchParams.get("scope") === "personnel" ? "personnel" : searchParams.get("scope") === "citizen" ? "citizen" : "all";

  return { q, page, pageSize, sortBy, sortDir, estado, rolId, scope };
}

export function buildUserWhere(
  q: string,
  estado = "",
  rolId = "",
  scope: "all" | "citizen" | "personnel" = "all",
): Prisma.UsuarioWhereInput {
  const parsedRoleId = Number(rolId);

  return {
    deletedAt: null,
    ...(estado === "INACTIVOS"
      ? { estado: { not: "ACTIVO" } }
      : estado
        ? { estado: estado as Prisma.EnumEstadoUsuarioFilter["equals"] }
        : {}),
    ...(Number.isInteger(parsedRoleId) && parsedRoleId > 0
      ? { rolId: parsedRoleId }
      : scope === "citizen"
        ? { rol: { OR: [
            { codigo: { in: ["user", "usuario", "citizen", "ciudadano"] } },
            { nombre: { in: ["user", "usuario", "ciudadano"], mode: "insensitive" } },
          ] } }
        : scope === "personnel"
          ? { NOT: { rol: { OR: [
              { codigo: { in: ["user", "usuario", "citizen", "ciudadano"] } },
              { nombre: { in: ["user", "usuario", "ciudadano"], mode: "insensitive" } },
            ] } } }
          : {}),
    ...(q
      ? {
          OR: [
            { userId: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { nombre: { contains: q, mode: "insensitive" } },
            { apellido: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}
