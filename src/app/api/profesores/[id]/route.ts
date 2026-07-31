import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  changeProfesorEstadoSchema,
  updateProfesorSchema,
} from "@/features/profesores/schemas/profesor.schema";
import {
  cambiarEstadoProfesor,
  desactivarProfesor,
  editarProfesor,
  obtenerProfesorPorId,
} from "@/features/profesores/services/profesores.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { buildAuditChanges,getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

type Context = { params: Promise<{ id: string }> };
async function getId(params: Context["params"]) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).id);
  return parsed.success ? parsed.data : null;
}

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "profesores", "ver");
    const id = await getId(params);
    if (!id)
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    const data = await obtenerProfesorPorId(id);
    if (!data)
      return NextResponse.json(
        { message: "Profesor no encontrado" },
        { status: 404 },
      );
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar el profesor.");
  }
}

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const user = await requireAuth(req);
    const id = await getId(params);
    if (!id)
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    const body: unknown = await req.json();
    const statusParsed = changeProfesorEstadoSchema.safeParse(body);
    if (statusParsed.success) {
      requirePermission(user, "profesores", "eliminar");
      const before=await obtenerProfesorPorId(id);const data=await cambiarEstadoProfesor(id,statusParsed.data.estado);
      await createAuditLog({actorId:user.id,action:statusParsed.data.estado==="ACTIVO"?"REACTIVAR":"DESACTIVAR",entityType:"PROFESOR",entityId:id,entityName:before?[before.usuario.nombre,before.usuario.apellido].filter(Boolean).join(" "):null,changes:{estado:{before:before?.estado??null,after:statusParsed.data.estado}},origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
      return NextResponse.json({
        data,
      });
    }
    requirePermission(user, "profesores", "editar");
    const parsed = updateProfesorSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { message: "Datos inválidos", details: parsed.error.flatten() },
        { status: 400 },
      );
    const before=await obtenerProfesorPorId(id);const data=await editarProfesor(id,parsed.data);
    await createAuditLog({actorId:user.id,action:"EDITAR",entityType:"PROFESOR",entityId:id,entityName:[data.usuario.nombre,data.usuario.apellido].filter(Boolean).join(" "),changes:buildAuditChanges((before??{}) as unknown as Record<string,unknown>,data as unknown as Record<string,unknown>,["especialidad","descripcion","matricula","estado"]),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos actualizar el profesor.");
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "profesores", "eliminar");
    const id = await getId(params);
    if (!id)
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    const before=await obtenerProfesorPorId(id);const data=await desactivarProfesor(id);
    await createAuditLog({actorId:user.id,action:"DESACTIVAR",entityType:"PROFESOR",entityId:id,entityName:before?[before.usuario.nombre,before.usuario.apellido].filter(Boolean).join(" "):null,changes:{estado:{before:before?.estado??null,after:"INACTIVO"}},origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos desactivar el profesor.");
  }
}
