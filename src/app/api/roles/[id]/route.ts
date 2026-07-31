import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { getRoleById, updateRole } from "@/lib/services/role.service";
import { updateRoleSchema } from "@/features/roles/schemas/role.schema";
import { mapRoleRouteError } from "@/features/roles/lib/role.errors";
import { parseRoleId } from "@/features/roles/lib/role.params";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { buildAuditChanges,getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "roles", "ver");

    const { id } = await params;
    const roleId = parseRoleId(id);

    if (!roleId) {
      return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
    }

    const role = await getRoleById(roleId);

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({ data: role });
  } catch (error) {
    return mapRoleRouteError(error);
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "roles", "editar");

    const { id } = await params;
    const roleId = parseRoleId(id);

    if (!roleId) {
      return NextResponse.json({ error: "Invalid role id" }, { status: 400 });
    }

    const body = await req.json();
    const dto = updateRoleSchema.parse(body);

    const existing = await getRoleById(roleId);

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const updated = await updateRole(roleId, dto);
    await createAuditLog({actorId:user.id,action:dto.activo===true&&!existing.activo?"REACTIVAR":dto.activo===false&&existing.activo?"DESACTIVAR":"EDITAR",entityType:"ROL",entityId:String(roleId),entityName:updated.nombre,changes:buildAuditChanges(existing as unknown as Record<string,unknown>,updated as unknown as Record<string,unknown>,["nombre","descripcion","activo"]),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return NextResponse.json({ data: updated });
  } catch (error) {
    return mapRoleRouteError(error);
  }
}
