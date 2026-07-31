import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "resources", "ver");
    const establishments = await prisma.establecimiento.findMany({
      select: { id: true, nombre: true, direccion: true, activo: true, estado: true },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json({ data: { establishments } });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar las opciones de recursos.");
  }
}
