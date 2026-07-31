import { NextRequest, NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { manualRegisterSchema } from "@/features/access/schemas/access.schema";
import { registerManualAccess } from "@/features/access/services/access.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
export async function POST(req: NextRequest) { try { const user = await requireAuth(req); requirePermission(user, "access", "crear"); const parsed = manualRegisterSchema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ message: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 }); if (parsed.data.decision === "ALLOW") requirePermission(user, "access", "asignar"); return NextResponse.json({ data: await registerManualAccess(parsed.data, user.id, getAuditRequestContext(req.headers)) }, { status: 201 }); } catch (error) { return mapApiRouteError(error, "No pudimos registrar el ingreso manual."); } }
