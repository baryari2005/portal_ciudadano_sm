import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { completeProfileSchema } from "@/features/auth/schemas/complete-profile.schema";
import { prisma } from "@/lib/db";
import { getServerMe } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const me = await getServerMe(req);

  if (!me.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const dto = completeProfileSchema.parse(body);

    const updated = await prisma.usuario.update({
      where: { id: me.user.id },
      data: {
        nombre: dto.nombre,
        apellido: dto.apellido,
        documento: dto.documento,
        domicilio: dto.domicilio,
        celular: dto.celular,
        fechaNacimiento: new Date(`${dto.fechaNacimiento}T00:00:00.000Z`),
        perfilCompleto: true,
        estado: "PENDIENTE",
      },
      select: { id: true, estado: true, perfilCompleto: true },
    });

    return NextResponse.json({
      user: updated,
      redirectTo: "/cuenta-pendiente",
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "El DNI o email ya está registrado." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "No se pudo completar el perfil." },
      { status: 400 },
    );
  }
}
