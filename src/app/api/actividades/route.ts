import { NextRequest, NextResponse } from "next/server";

import {
  ACTIVIDAD_NIVELES,
  ACTIVIDAD_ESTADOS_COMPATIBLES,
  actividadSchema,
  type ActividadEstado,
  type ActividadNivel,
} from "@/features/actividades/schemas/actividad.schema";
import {
  createActividad,
  listActividades,
} from "@/features/actividades/services/actividades.server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { mapApiRouteError } from "@/lib/api/route-error";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function optionalBoolean(value: string | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "actividades", "ver");

    const params = req.nextUrl.searchParams;
    const nivel = params.get("nivel");
    const estado = params.get("estado");
    const data = await listActividades({
      search: params.get("search") || undefined,
      nombre: params.get("nombre") || undefined,
      estado: ACTIVIDAD_ESTADOS_COMPATIBLES.includes(estado as ActividadEstado)
        ? (estado as ActividadEstado)
        : undefined,
      establecimientoId: params.get("establecimientoId") || undefined,
      categoriaActividadId: params.get("categoriaActividadId") || undefined,
      publicoObjetivoId: params.get("publicoObjetivoId") || undefined,
      nivel: ACTIVIDAD_NIVELES.includes(nivel as ActividadNivel)
        ? (nivel as ActividadNivel)
        : undefined,
      esGratuita: optionalBoolean(params.get("esGratuita")),
      requiereCertificadoMedico: optionalBoolean(
        params.get("requiereCertificadoMedico"),
      ),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar actividades.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "actividades", "crear");

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

    const data = await createActividad(parsed.data);
    await createAuditLog({actorId:user.id,action:"CREAR",entityType:"ACTIVIDAD",entityId:data.id,entityName:data.nombre,origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos crear la actividad.");
  }
}
