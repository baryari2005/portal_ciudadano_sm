import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { createUserSchema } from "@/features/users/schemas/user.schema";
import { parseUserListParams } from "@/features/users/lib/user.filters";
import { toUserListItem } from "@/features/users/lib/user.mapper";
import {
  listUsers,
  createOrReviveUser,
  handleUserError,
} from "@/features/users/services/user.service";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const loggedInUser = await requireAuth(req);
    requirePermission(loggedInUser, "usuarios", "ver");

    const params = parseUserListParams(req.url);
    const { items, meta } = await listUsers(params);

    return NextResponse.json({
      data: items.map(toUserListItem),
      meta,
    });
  } catch (error) {
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

    return NextResponse.json(
      { message: "No pudimos cargar los usuarios." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const loggedInUser = await requireAuth(req);
  requirePermission(loggedInUser, "usuarios", "crear");

  try {
    const body = await req.json();
    const dto = createUserSchema.parse(body);

    const result = await createOrReviveUser(dto);
    await createAuditLog({actorId:loggedInUser.id,action:result.revived?"REACTIVAR":"CREAR",entityType:"USUARIO",entityId:result.id,entityName:[dto.nombre,dto.apellido].filter(Boolean).join(" "),origin:"ADMINISTRACION",requestContext:getAuditRequestContext(req.headers)});

    return NextResponse.json(result, {
      status: result.revived ? 200 : 201,
    });
  } catch (err: unknown) {
    const { message, status } = handleUserError(err);
    return NextResponse.json({ message }, { status });
  }
}
