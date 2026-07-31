import { NextRequest, NextResponse } from "next/server";

import { getCurrentAccessRequest } from "@/features/auth/request-access/services/requestAccess.server";
import { getServerMe } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getServerMe(req);
  if (!user) {
    return NextResponse.json({ message: "Sesión no válida." }, { status: 401 });
  }

  const request = await getCurrentAccessRequest(user.id);
  return NextResponse.json({
    user: { estado: user.estado, nombre: user.nombre, apellido: user.apellido },
    request,
  });
}
