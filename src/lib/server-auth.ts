import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { getUserAccessStatus } from "@/features/auth/libs/access-state";
import { prisma } from "@/lib/db";
import { verifyJwt } from "@/lib/jwt";

type UserWithPermissions = Prisma.UsuarioGetPayload<{
  include: {
    rol: {
      include: {
        permisos: {
          include: {
            permiso: true;
          };
        };
      };
    };
    legajo: {
      select: {
        numeroLegajo: true;
        estadoLaboral: true;
        tipoContrato: true;
        puesto: true;
        area: true;
        departamento: true;
      };
    };
  };
}>;

type PermissionDTO = {
  modulo: string;
  accion: string;
};

type ServerUser = Omit<UserWithPermissions, "password"> & {
  permisos: PermissionDTO[];
};

type JwtPayload = {
  uid: string | number;
  rid?: string | number;
  rname?: string;
};

export async function getBearer(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export function requirePermission(
  user: Pick<ServerUser, "permisos">,
  modulo: string,
  accion: string,
) {
  const has = user.permisos?.some(
    (permission: PermissionDTO) =>
      permission.modulo === modulo && permission.accion === accion,
  );

  if (!has) {
    throw new Error("FORBIDDEN");
  }
}

export async function getServerMe(
  req: NextRequest,
): Promise<{ user: ServerUser | null }> {
  const token = await getBearer(req);

  if (!token) return { user: null };

  try {
    const payload = (await verifyJwt(token)) as JwtPayload;

    const user: UserWithPermissions | null = await prisma.usuario.findUnique({
      where: { id: String(payload.uid) },
      include: {
        rol: {
          include: {
            permisos: {
              include: {
                permiso: true,
              },
            },
          },
        },
        legajo: {
          select: {
            numeroLegajo: true,
            estadoLaboral: true,
            tipoContrato: true,
            puesto: true,
            area: true,
            departamento: true,
          },
        },
      },
    });

    if (!user) return { user: null };

    const safeUser = Object.fromEntries(
      Object.entries(user).filter(([key]) => key !== "password"),
    ) as Omit<UserWithPermissions, "password">;

    const permisos: PermissionDTO[] =
      user.rol?.permisos.map((rp) => ({
        modulo: rp.permiso.modulo,
        accion: rp.permiso.accion,
      })) ?? [];

    return {
      user: {
        ...safeUser,
        permisos,
      },
    };
  } catch {
    return { user: null };
  }
}

export async function requireAuth(req: NextRequest): Promise<ServerUser> {
  const me = await getServerMe(req);

  if (!me.user) {
    throw new Error("UNAUTHORIZED");
  }

  if (getUserAccessStatus(me.user)) {
    throw new Error("ACCOUNT_NOT_ALLOWED");
  }

  return me.user;
}
