import { NextRequest, NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { qrAccessSchema } from "@/features/access/schemas/access.schema";
import { validateQrAccess } from "@/features/access/services/access.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
export async function POST(req: NextRequest) { try { const user = await requireAuth(req); requirePermission(user, "access", "crear"); const parsed = qrAccessSchema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ message: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 }); return NextResponse.json(await validateQrAccess(parsed.data.establishmentId, parsed.data.qrToken, user.id, getAuditRequestContext(req.headers)), { status: 201 }); } catch (error) { return mapApiRouteError(error, "No pudimos validar el ingreso."); } }
