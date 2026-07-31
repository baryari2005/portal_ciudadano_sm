import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { createRole } from "@/lib/services/role.service";
import { createRoleSchema } from "@/features/roles/schemas/role.schema";
import { mapRoleRouteError } from "@/features/roles/lib/role.errors";
import { parseRoleListParams } from "@/features/roles/lib/role.filters";
import { listRoles } from "@/features/roles/services/role.service";
import { toRoleListItem } from "@/features/roles/lib/role.mapper";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "roles", "ver");

  const params = parseRoleListParams(req.url);
  const { items, meta } = await listRoles(params);

  return NextResponse.json({
    data: items.map(toRoleListItem),
    meta,
  });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "roles", "crear");

    const body = await req.json();
    const parsed = createRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const role = await createRole(parsed.data);
    await createAuditLog({actorId:user.id,action:"CREAR",entityType:"ROL",entityId:String(role.id),entityName:role.nombre,origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (error) {
    return mapRoleRouteError(error);
  }
}
