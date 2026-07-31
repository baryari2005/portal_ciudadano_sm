import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/schemas/password";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = resetPasswordSchema.parse(body);

    const tokenHash = createHash("sha256").update(dto.token).digest("hex");

    // Tomamos el más reciente válido (por si se emitieron varios)
    const rec = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!rec) {
      return NextResponse.json(
        { error: "Token inválido o vencido" },
        { status: 401 },
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await prisma.$transaction([
      prisma.usuario.update({
        where: { id: rec.userId },
        data: { password: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: rec.userId,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error?.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  }
}
