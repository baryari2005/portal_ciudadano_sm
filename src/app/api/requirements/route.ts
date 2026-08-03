import { NextRequest, NextResponse } from "next/server";
import { RequisitoTipo } from "@prisma/client";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { requirementSchema } from "@/features/requirements/schemas/requirement.schema";
import { createRequirement, listRequirements } from "@/features/requirements/services/requirements.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const boolean = (value: string | null) => value === "true" ? true : value === "false" ? false : undefined;
const receptionRole = (code?: string | null) => ["reception", "recepcion"].includes(code?.trim().toLowerCase() ?? "");

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const isReception = receptionRole(user.rol.codigo);
    requirePermission(user, isReception ? "enrollment_documents" : "requirements", isReception ? "editar" : "ver");
    const params = req.nextUrl.searchParams;
    const requestedType = params.get("type");
    const type = Object.values(RequisitoTipo).includes(requestedType as RequisitoTipo) ? requestedType as RequisitoTipo : undefined;
    const data = await listRequirements({ search: params.get("search") || undefined, type, active: isReception ? true : boolean(params.get("active")), requiresDocument: isReception ? true : boolean(params.get("requiresDocument")), orderBy: ["orden", "nombre", "createdAt", "updatedAt"].includes(params.get("orderBy") ?? "") ? params.get("orderBy") as "orden" : undefined, orderDir: params.get("orderDir") === "desc" ? "desc" : "asc" });
    return NextResponse.json({ data: isReception ? data.filter((requirement) => requirement.documentoPersonal) : data });
  } catch (error) { return mapApiRouteError(error, "No pudimos cargar requisitos."); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "requirements", "crear");
    const parsed = requirementSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    const data = await createRequirement(parsed.data);
    await createAuditLog({ actorId: user.id, action: "CREAR", entityType: "REQUISITO", entityId: data.id, entityName: data.nombre, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return mapApiRouteError(error, "No pudimos crear el requisito."); }
}
