import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendPasswordReset } from "@/lib/mailer";
import { UsersRepo } from "@/lib/repos/users";
import { forgotPasswordSchema } from "@/lib/schemas/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_RESPONSE = {
  ok: true,
  message:
    "Si el email existe en el sistema, recibirás instrucciones para restablecer tu contraseña.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dto = forgotPasswordSchema.parse(body);

    const user = dto.email
      ? await UsersRepo.findByEmail(dto.email.toLowerCase().trim())
      : dto.userId
        ? await UsersRepo.findByUserId(dto.userId.toLowerCase().trim())
        : null;

    if (!user?.password) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const ttlMin = parseInt(process.env.PASSWORD_RESET_TTL_MIN || "30", 10);
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000);

    const tokenPlain = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(tokenPlain).digest("hex");

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${tokenPlain}`;

    await sendPasswordReset(user.email, resetLink, user.nombre ?? undefined);

    return NextResponse.json(GENERIC_RESPONSE);
  } catch {
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
