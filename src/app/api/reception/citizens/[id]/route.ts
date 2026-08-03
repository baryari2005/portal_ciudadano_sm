import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuditRequestContext, buildAuditChanges } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { receptionCitizenPatchSchema } from "@/features/reception/schemas/reception-citizen.schema";
import { getUserByIdOrThrow, mapUserDetailError, updateUserById } from "@/features/users/services/user-detail.service";
import { toUserDetail } from "@/features/users/lib/user.mapper";
import { requireAuth, requirePermission } from "@/lib/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

function requireReception(operator: Awaited<ReturnType<typeof requireAuth>>) {
  requirePermission(operator, "usuarios", "ver");
  if (operator.rol.codigo?.trim().toLowerCase() !== "reception") throw new Error("FORBIDDEN");
}

function assertCitizen(user: Awaited<ReturnType<typeof getUserByIdOrThrow>>) {
  const code = user.rol.codigo?.trim().toLowerCase();
  if (!["user", "usuario", "citizen", "ciudadano"].includes(code ?? "")) throw new Error("FORBIDDEN");
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuth(request);
    requireReception(operator);
    const user = await getUserByIdOrThrow((await context.params).id);
    assertCitizen(user);
    return NextResponse.json(toUserDetail(user));
  } catch (error) {
    if (error instanceof Error && ["UNAUTHORIZED", "FORBIDDEN", "ACCOUNT_NOT_ALLOWED"].includes(error.message)) {
      return NextResponse.json({ message: "Sin permisos" }, { status: error.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({
        message: "Revisá los datos ingresados.",
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      }, { status: 400 });
    }
    const mapped = mapUserDetailError(error);
    return NextResponse.json({ message: mapped.message }, { status: mapped.status });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuth(request);
    requirePermission(operator, "usuarios", "editar");
    requireReception(operator);
    const id = (await context.params).id;
    const before = await getUserByIdOrThrow(id);
    assertCitizen(before);
    const parsed = receptionCitizenPatchSchema.parse(await request.json());
    const dto = { ...parsed };
    const updated = await updateUserById(id, dto);
    const auditedFields = Object.keys(dto).filter((field) => field !== "password");
    await createAuditLog({
      actorId: operator.id,
      action: "EDITAR",
      entityType: "USUARIO",
      entityId: id,
      entityName: [updated.nombre, updated.apellido].filter(Boolean).join(" "),
      changes: buildAuditChanges(before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>, auditedFields),
      origin: "ADMINISTRACION",
      metadata: { workspace: "reception" },
      requestContext: getAuditRequestContext(request.headers),
    });
    if (dto.password) {
      await createAuditLog({
        actorId: operator.id,
        action: "EDITAR",
        entityType: "USUARIO",
        entityId: id,
        entityName: [updated.nombre, updated.apellido].filter(Boolean).join(" "),
        origin: "ADMINISTRACION",
        metadata: { workspace: "reception", operation: "PASSWORD_RESET" },
        requestContext: getAuditRequestContext(request.headers),
      });
    }
    return NextResponse.json(toUserDetail(updated));
  } catch (error) {
    if (error instanceof Error && ["UNAUTHORIZED", "FORBIDDEN", "ACCOUNT_NOT_ALLOWED"].includes(error.message)) {
      return NextResponse.json({ message: "Sin permisos" }, { status: error.message === "UNAUTHORIZED" ? 401 : 403 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({
        message: "Revisá los datos ingresados.",
        issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      }, { status: 400 });
    }
    const mapped = mapUserDetailError(error);
    return NextResponse.json({ message: mapped.message }, { status: mapped.status });
  }
}
