import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { patchUserSchema } from "@/features/users/schemas/user.patch.schema";
import { toUserDetail } from "@/features/users/lib/user.mapper";
import {
  getUserByIdOrThrow,
  updateUserById,
  softDeleteUserById,
  mapUserDetailError,
} from "@/features/users/services/user-detail.service";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { buildAuditChanges,getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, ctx: RouteContext) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "usuarios", "editar");

  try {
    const { id } = await ctx.params;
    const user = await getUserByIdOrThrow(id);

    return NextResponse.json(toUserDetail(user));
  } catch (error) {
    const { message, status } = mapUserDetailError(error);
    return NextResponse.json({ message }, { status });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "usuarios", "editar");

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const dto = patchUserSchema.parse(body);

    if (dto.estado === "ACTIVO" || dto.estado === "RECHAZADO") {
      return NextResponse.json(
        { message: "Usá el circuito de revisión de solicitudes de acceso." },
        { status: 400 },
      );
    }

    const before=await getUserByIdOrThrow(id);
    const updated = await updateUserById(id, dto);
    await createAuditLog({actorId:loggedInUser.id,action:"EDITAR",entityType:"USUARIO",entityId:id,entityName:[updated.nombre,updated.apellido].filter(Boolean).join(" "),changes:buildAuditChanges(before as unknown as Record<string,unknown>,updated as unknown as Record<string,unknown>,Object.keys(dto).filter(key=>!["password"].includes(key))),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return NextResponse.json(toUserDetail(updated));
  } catch (error) {
    const { message, status } = mapUserDetailError(error);
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "usuarios", "eliminar");

  try {
    const { id } = await ctx.params;
    const before=await getUserByIdOrThrow(id);
    await softDeleteUserById(id);
    await createAuditLog({actorId:loggedInUser.id,action:"DESACTIVAR",entityType:"USUARIO",entityId:id,entityName:[before.nombre,before.apellido].filter(Boolean).join(" "),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const { message, status } = mapUserDetailError(error);
    return NextResponse.json({ message }, { status });
  }
}
