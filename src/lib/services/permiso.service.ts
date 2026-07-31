import { prisma } from "@/lib/db";
import { Permiso } from "@prisma/client";

export async function getAllPermisos(): Promise<Permiso[]> {
  return prisma.permiso.findMany({
    where: { activo: true },
    orderBy: [{ modulo: "asc" }, { accion: "asc" }],
  });
}

type PermisosAgrupados = {
  modulo: string;
  permisos: Permiso[];
};

export async function getPermisosGroupedByModulo(): Promise<
  PermisosAgrupados[]
> {
  const permisos = await getAllPermisos();

  const grouped: Record<string, Permiso[]> = {};

  for (const permiso of permisos) {
    if (!grouped[permiso.modulo]) {
      grouped[permiso.modulo] = [];
    }

    grouped[permiso.modulo].push(permiso);
  }

  return Object.entries(grouped).map(([modulo, permisos]) => ({
    modulo,
    permisos,
  }));
}
