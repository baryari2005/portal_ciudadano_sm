import { prisma } from "@/lib/db";
import { buildRoleWhere } from "../lib/role.filters";

export async function listRoles(params: {
  q: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  activo?: boolean;
}) {
  const { q, page, pageSize, sortBy, sortDir, activo } = params;

  const where = buildRoleWhere(q, activo);

  const total = await prisma.rol.count({ where });

  const items = await prisma.rol.findMany({
    where,
    include: {
      _count: {
        select: {
          permisos: true,
          usuarios: true,
        },
      },
    },
    orderBy: { [sortBy]: sortDir },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    meta: { total, page, pageSize, pageCount },
  };
}
