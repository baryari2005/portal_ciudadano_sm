import { NextRequest, NextResponse } from "next/server";

import {
  actividadSchema,
  updateActividadSchema,
} from "@/features/actividades/schemas/actividad.schema";
import {
  archiveActivity,
  getActividad,
  patchActividad,
  updateActividad,
} from "@/features/actividades/services/actividades.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { buildAuditChanges, getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "actividades", "ver");

    const { id } = await params;
    const data = await getActividad(id);

    if (!data) {
      return NextResponse.json({ message: "No encontrada" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar la actividad.");
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "actividades", "editar");

    const { id } = await params;
    const body = await req.json();
    if (Object.prototype.hasOwnProperty.call(body, "requirements")) {
      requirePermission(user, "requirements", "asignar");
    }
    const parsed = actividadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const before = await getActividad(id);
    if (parsed.data.estado === "CANCELADA" && before?.estado !== "CANCELADA") {
      return NextResponse.json(
        { message: "Usá el flujo de baja para cancelar la actividad y procesar sus relaciones." },
        { status: 409 },
      );
    }

    const data = await updateActividad(id, parsed.data);
    await createAuditLog({actorId:user.id,action:"EDITAR",entityType:"ACTIVIDAD",entityId:id,entityName:data.nombre,changes:buildAuditChanges((before??{}) as Record<string,unknown>,data as Record<string,unknown>,["nombre","descripcionCorta","descripcion","nivel","edadMinima","edadMaxima","esGratuita","precio","establecimientoId","categoriaActividadId","cupo","estado"]),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos actualizar la actividad.");
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "actividades", "editar");

    const { id } = await params;
    const body = await req.json();
    if (Object.prototype.hasOwnProperty.call(body, "requirements")) {
      requirePermission(user, "requirements", "asignar");
    }
    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { message: "No se informaron cambios" },
        { status: 400 },
      );
    }
    const parsed = updateActividadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Datos invalidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    }


    const before = await getActividad(id);
    if (parsed.data.estado === "CANCELADA" && before?.estado !== "CANCELADA") {
      return NextResponse.json(
        { message: "Usá el flujo de baja para cancelar la actividad y procesar sus relaciones." },
        { status: 409 },
      );
    }

    const data = await patchActividad(id, parsed.data);
    await createAuditLog({actorId:user.id,action:"EDITAR",entityType:"ACTIVIDAD",entityId:id,entityName:data.nombre,changes:buildAuditChanges((before??{}) as Record<string,unknown>,data as Record<string,unknown>,Object.keys(parsed.data)),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos actualizar la actividad.");
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "actividades", "eliminar");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : "";
    const before = await getActividad(id);
    const result = await archiveActivity(id, reason);
    await createAuditLog({actorId:user.id,action:"CANCELAR",entityType:"ACTIVIDAD",entityId:id,entityName:before?.nombre??null,changes:{estado:{before:before?.estado??null,after:"CANCELADA"}},metadata:{reason,cancelledSessions:result.cancelledSessions,notifiedUsers:result.notifiedUsers},origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return NextResponse.json({ ok: true, data: { estado: "CANCELADA" } });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos eliminar la actividad.");
  }
}
