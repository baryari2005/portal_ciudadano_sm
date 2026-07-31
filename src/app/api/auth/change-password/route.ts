import { compare, hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { checkPassword, hashPassword } from "@/lib/passwords";
import { UsersRepo } from "@/lib/repos/users";
import { getServerMe, requireAuth } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
});

function missingPasswordResponse() {
  return NextResponse.json(
    { error: "Esta cuenta no tiene una contraseña local configurada." },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { currentPassword, newPassword } = schema.parse(await req.json());

    const dbUser = await UsersRepo.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!dbUser.password) {
      return missingPasswordResponse();
    }

    const ok = await checkPassword(currentPassword, dbUser.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Clave actual incorrecta" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await UsersRepo.updatePassword(user.id, passwordHash);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const me = await getServerMe(req);
  if (!me?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = schema.parse(await req.json());

  const user = await prisma.usuario.findUnique({ where: { id: me.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!user.password) {
    return missingPasswordResponse();
  }

  const ok = await compare(currentPassword, user.password);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid current password" },
      { status: 400 },
    );
  }

  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      password: await hash(newPassword, 12),
      mustChangePassword: false,
    },
  });

  return NextResponse.json({ ok: true });
}
