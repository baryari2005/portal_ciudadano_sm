import { NextRequest, NextResponse } from "next/server";

import { establecimientoSchema } from "@/features/establecimientos/schemas/establecimiento.schema";
import {
  createEstablecimiento,
  EstablecimientoConflictError,
  listEstablecimientos,
} from "@/features/establecimientos/services/establecimientos.server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "establecimientos", "ver");

    const data = await listEstablecimientos();
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, "No pudimos cargar establecimientos.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "establecimientos", "crear");

    const body = await req.json();
    const parsed = establecimientoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = await createEstablecimiento(parsed.data);
    await createAuditLog({actorId:user.id,action:"CREAR",entityType:"ESTABLECIMIENTO",entityId:data.id,entityName:data.nombre,origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "No pudimos crear el establecimiento.");
  }
}

function handleRouteError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
  }

  if (error instanceof Error && error.message === "ACCOUNT_NOT_ALLOWED") {
    return NextResponse.json(
      { message: "Cuenta no habilitada" },
      { status: 403 },
    );
  }

  if (error instanceof EstablecimientoConflictError) {
    return NextResponse.json(
      { message: error.message },
      { status: error.status },
    );
  }

  return NextResponse.json({ message: fallback }, { status: 500 });
}
