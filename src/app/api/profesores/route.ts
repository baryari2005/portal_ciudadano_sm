import { NextRequest, NextResponse } from "next/server";

import {
  createProfesorSchema,
  profesorFiltersSchema,
} from "@/features/profesores/schemas/profesor.schema";
import {
  crearProfesor,
  listarProfesores,
} from "@/features/profesores/services/profesores.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "profesores", "ver");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = profesorFiltersSchema.safeParse(params);
    if (!parsed.success)
      return NextResponse.json(
        { message: "Filtros inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    const result = await listarProfesores(parsed.data);
    return NextResponse.json({ data: result.items, meta: result.meta });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar los profesores.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "profesores", "crear");
    const parsed = createProfesorSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json(
        { message: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    const data=await crearProfesor(parsed.data);
    await createAuditLog({actorId:user.id,action:"CREAR",entityType:"PROFESOR",entityId:data.id,entityName:[data.usuario.nombre,data.usuario.apellido].filter(Boolean).join(" "),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json(
      { data },
      { status: 201 },
    );
  } catch (error) {
    return mapApiRouteError(error, "No pudimos crear el profesor.");
  }
}
