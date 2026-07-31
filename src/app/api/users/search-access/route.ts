import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);

    const query = req.nextUrl.searchParams.get("q") ?? "";
    const rows = await prisma.usuario.findMany({ where: { deletedAt: null, OR: [{ documento: { contains: query } }, { nombre: { contains: query, mode: "insensitive" } }, { apellido: { contains: query, mode: "insensitive" } }] }, take: 12, select: { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true, fotoPerfilUrl: true } });
    const users = rows.map((user) => ({ id: user.id, nombre: user.nombre, apellido: user.apellido, dni: user.documento ?? "", avatarUrl: user.avatarUrl, profilePhotoUrl: user.fotoPerfilUrl }));

    return NextResponse.json({ data: users });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "ACCOUNT_NOT_ALLOWED") {
      return NextResponse.json(
        { message: "Cuenta no habilitada" },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "No pudimos buscar personas." },
      { status: 500 },
    );
  }
}
