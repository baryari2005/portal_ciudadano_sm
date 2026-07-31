import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { getRoleById, setRolePermissions } from "@/lib/services/role.service";
import { setPermissionsSchema } from "@/features/roles/schemas/role.schema";
import { parseRoleId } from "@/features/roles/lib/role.params";
import { mapRoleRouteError } from "@/features/roles/lib/role.errors";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
    const dto = setPermissionsSchema.parse(body);

    const existing = await getRoleById(roleId);

    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await setRolePermissions(roleId, dto.permisoIds);
    const beforeIds=existing.permisos.map(item=>item.permisoId),beforeSet=new Set(beforeIds),afterSet=new Set(dto.permisoIds);
    await createAuditLog({actorId:user.id,action:"ASIGNAR",entityType:"PERMISO",entityId:String(roleId),entityName:`Permisos de ${existing.nombre}`,metadata:{added:dto.permisoIds.filter(id=>!beforeSet.has(id)),removed:beforeIds.filter(id=>!afterSet.has(id))},origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return NextResponse.json({ success: true });
  } catch (error) {
    return mapRoleRouteError(error);
  }
}
