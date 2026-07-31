import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type CreateRoleInput = {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
  permisoIds?: number[];
};

export type UpdateRoleInput = {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
};

export async function getAllRoles() {
  return prisma.rol.findMany({
    include: {
      permisos: {
        include: {
          permiso: true,
        },
      },
      _count: {
        select: {
          permisos: true,
          usuarios: true,
        },
      },
    },
    orderBy: {
      nombre: "asc",
    },
  });
}

export async function getRoleById(id: number) {
  return prisma.rol.findUnique({
    where: { id },
    include: {
      permisos: {
        include: {
          permiso: true,
        },
      },
      _count: {
        select: {
          permisos: true,
          usuarios: true,
        },
      },
    },
  });
}

export async function createRole(data: CreateRoleInput) {
  return prisma.$transaction(async (tx) => {
    const [role] = await tx.$queryRaw<Array<{ id: number; codigo: string; nombre: string; descripcion: string | null; activo: boolean; createdAt: Date; updatedAt: Date }>>(Prisma.sql`
      INSERT INTO "Rol" ("codigo", "nombre", "descripcion", "activo", "createdAt", "updatedAt")
      VALUES (${data.codigo}, ${data.nombre}, ${data.descripcion ?? null}, ${data.activo ?? true}, NOW(), NOW())
      RETURNING "id", "codigo", "nombre", "descripcion", "activo", "createdAt", "updatedAt"
    `);

    if (data.permisoIds?.length) {
      await tx.rolPermiso.createMany({
        data: data.permisoIds.map((permisoId) => ({ rolId: role.id, permisoId })),
      });
    }

    return role;
  });
}

export async function updateRole(id: number, data: UpdateRoleInput) {
  return prisma.rol.update({
    where: { id },
    data: {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.descripcion !== undefined && {
        descripcion: data.descripcion,
      }),
      ...(data.activo !== undefined && { activo: data.activo }),
    },
  });
}

export async function setRolePermissions(roleId: number, permisoIds: number[]) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.rolPermiso.deleteMany({
      where: { rolId: roleId },
    });

    if (permisoIds.length === 0) {
      return;
    }

    await tx.rolPermiso.createMany({
      data: permisoIds.map((permisoId) => ({
        rolId: roleId,
        permisoId,
      })),
    });
  });
}
