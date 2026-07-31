import { NextRequest, NextResponse } from "next/server";

import {
  getAllPermisos,
  getPermisosGroupedByModulo,
} from "@/lib/services/permiso.service";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "roles", "ver");

    const grouped = new URL(req.url).searchParams.get("grouped") === "true";
    const data = grouped
      ? await getPermisosGroupedByModulo()
      : await getAllPermisos();

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    }

    return NextResponse.json(
      { message: "No pudimos cargar los permisos." },
      { status: 500 },
    );
  }
}
