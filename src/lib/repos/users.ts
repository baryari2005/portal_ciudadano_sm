import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const UsersRepo = {
  findByEmailOrUserId: (email?: string, userId?: string) => {
    const orFilters: Prisma.UsuarioWhereInput[] = [
      ...(email ? [{ email }] : []),
      ...(userId ? [{ userId }] : []),
    ];

    return prisma.usuario.findFirst({
      where: orFilters.length > 0 ? { OR: orFilters } : {},
      include: { rol: true, legajo: true },
    });
  },

  findByEmail: (email: string) =>
    prisma.usuario.findUnique({
      where: { email },
      include: { rol: true, legajo: true },
    }),

  findByUserId: (userId: string) =>
    prisma.usuario.findUnique({
      where: { userId },
      include: { rol: true, legajo: true },
    }),

  findById: (id: string) =>
    prisma.usuario.findUnique({
      where: { id },
      include: { rol: true, legajo: true },
    }),

  updateEmail: (id: string, email: string) =>
    prisma.usuario.update({ where: { id }, data: { email } }),

  updatePassword: (id: string, passwordHash: string) =>
    prisma.usuario.update({ where: { id }, data: { password: passwordHash } }),
};
