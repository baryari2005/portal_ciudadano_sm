import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth(req);
    const { avatarUrl } = await req.json();

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json(
        { error: "avatarUrl requerido" },
        { status: 400 },
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: me.id },
      select: { id: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      return NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 },
      );
    }

    const updated = await prisma.usuario.update({
      where: { id: me.id },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error?.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }
}
