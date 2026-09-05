import { NextRequest, NextResponse } from "next/server";

import { establecimientoSchema } from "@/features/establecimientos/schemas/establecimiento.schema";
import {
  deactivateEstablecimiento,
  EstablecimientoConflictError,
  getEstablecimiento,
  updateEstablecimiento,
} from "@/features/establecimientos/services/establecimientos.server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { buildAuditChanges,getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "establecimientos", "ver");

    const { id } = await params;
    const data = await getEstablecimiento(id);

    if (!data) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, "No pudimos cargar el establecimiento.");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "establecimientos", "editar");

    const { id } = await params;
    const body = await req.json();
    const parsed = establecimientoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const before = await getEstablecimiento(id);
    const data = await updateEstablecimiento(id, parsed.data);
    await createAuditLog({actorId:user.id,action:"EDITAR",entityType:"ESTABLECIMIENTO",entityId:id,entityName:data.nombre,changes:buildAuditChanges((before??{}) as Record<string,unknown>,data as unknown as Record<string,unknown>,["nombre","direccion","email","telefono","estado","observacion","barrio","horarios"]),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, "No pudimos actualizar el establecimiento.");
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "establecimientos", "eliminar");

    const { id } = await params;
    const before = await getEstablecimiento(id);
    await deactivateEstablecimiento(id);
    await createAuditLog({actorId:user.id,action:"DESACTIVAR",entityType:"ESTABLECIMIENTO",entityId:id,entityName:before?.nombre??null,changes:{estado:{before:before?.estado??null,after:"inactivo"}},origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "No pudimos desactivar el establecimiento.");
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
