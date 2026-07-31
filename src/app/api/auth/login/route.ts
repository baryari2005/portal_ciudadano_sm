import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { signJwt } from "@/lib/jwt";
import { checkPassword } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, password } = body || {};
    const normalizedUserId =
      typeof userId === "string" ? userId.trim().toLowerCase() : "";

    if (!normalizedUserId || !password) {
      return NextResponse.json(
        { error: "User ID y password son requeridos" },
        { status: 400 },
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { userId: normalizedUserId },
      include: {
        rol: {
          include: {
            permisos: { include: { permiso: true } },
          },
        },
      },
    });

    if (!user?.password || !(await checkPassword(password, user.password))) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 },
      );
    }

    if (user.estado === "BLOQUEADO") {
      return NextResponse.json(
        { error: "Tu cuenta no está habilitada para ingresar." },
        { status: 403 },
      );
    }

    if (!user.perfilCompleto) {
      return NextResponse.json(
        {
          error: "Tu perfil está incompleto.",
          redirectTo: "/completar-perfil",
        },
        { status: 403 },
      );
    }

    const token = await signJwt({
      uid: user.id,
      rid: user.rol?.id,
      rname: user.rol?.nombre,
    });
    const limitedAccess =
      user.estado === "PENDIENTE" || user.estado === "RECHAZADO";

    return NextResponse.json({
      token,
      redirectTo: limitedAccess ? "/request-access/status" : null,
      user: {
        id: user.id,
        userId: user.userId,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        estado: user.estado,
        perfilCompleto: user.perfilCompleto,
        rol: user.rol
          ? { id: user.rol.id, nombre: user.rol.nombre }
          : null,
        permisos:
          user.rol?.permisos.map((rp) => ({
            modulo: rp.permiso.modulo,
            accion: rp.permiso.accion,
          })) ?? [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
