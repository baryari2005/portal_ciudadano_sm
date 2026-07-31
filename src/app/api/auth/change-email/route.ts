import { NextRequest, NextResponse } from "next/server";

import { checkPassword } from "@/lib/passwords";
import { UsersRepo } from "@/lib/repos/users";
import { requireAuth } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const dbUser = await UsersRepo.findById(user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!dbUser.password) {
      return NextResponse.json(
        { error: "Esta cuenta no tiene una contraseña local configurada." },
        { status: 400 },
      );
    }

    const ok = await checkPassword(password, dbUser.password);
    if (!ok) {
      return NextResponse.json({ error: "Clave incorrecta" }, { status: 400 });
    }

    await UsersRepo.updateEmail(user.id, email);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
