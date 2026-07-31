import { Prisma } from "@prisma/client";

type SortDir = "asc" | "desc";

const sortWhitelist = new Set([
  "id",
  "codigo",
  "nombre",
  "descripcion",
  "activo",
  "createdAt",
]);

export function parseRoleListParams(url: string) {
  const { searchParams } = new URL(url);

  const q = (searchParams.get("q") || "").trim();

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "8", 10)),
  );

  const rawSortBy = searchParams.get("sortBy") || "";
  const sortBy = sortWhitelist.has(rawSortBy) ? rawSortBy : "createdAt";

  const sortDir: SortDir =
    (searchParams.get("sortDir") || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const activeParam = searchParams.get("activo");
  const activo =
    activeParam === "true" ? true : activeParam === "false" ? false : undefined;

  return { q, page, pageSize, sortBy, sortDir, activo };
}

export function buildRoleWhere(
  q: string,
  activo?: boolean,
): Prisma.RolWhereInput {
  return {
    ...(activo === undefined ? {} : { activo }),
    ...(q
      ? {
          OR: [
            { codigo: { contains: q, mode: "insensitive" as const } },
            { nombre: { contains: q, mode: "insensitive" as const } },
            { descripcion: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}
