import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createReceptionRequest, mapReceptionRequestError } from "@/features/reception/services/reception-request.server";
import { receptionRequestSchema } from "@/features/reception/schemas/reception-request.schema";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const operator = await requireAuth(request);
    requirePermission(operator, "access", "ver");
    requirePermission(operator, "usuarios", "crear");
    const roleCode = (operator.rol.codigo || "").trim().toLowerCase();
    if (roleCode !== "reception") return NextResponse.json({ message: "Esta operación pertenece a la experiencia de Recepción." }, { status: 403 });
    const citizenRole = await import("@/lib/db").then(({ prisma }) => prisma.rol.findUnique({ where: { codigo: "citizen", activo: true }, select: { id: true } }));
    if (!citizenRole) return NextResponse.json({ message: "No está configurado el rol ciudadano." }, { status: 500 });
    const body = await request.json();
    const input = receptionRequestSchema.parse({ ...body, rolId: citizenRole.id });
    const data = await createReceptionRequest(input, { id: operator.id, nombre: operator.nombre, apellido: operator.apellido }, getAuditRequestContext(request.headers));
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({
      message: "Los datos ingresados no son válidos.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    }, { status: 400 });
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    if (error instanceof Error && (error.message === "FORBIDDEN" || error.message === "ACCOUNT_NOT_ALLOWED")) return NextResponse.json({ message: "Sin permisos" }, { status: 403 });
    const mapped = mapReceptionRequestError(error);
    return NextResponse.json({ message: mapped.message }, { status: mapped.status });
  }
}
