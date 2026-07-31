import { NextRequest, NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { annulAccessSchema, updateAccessSchema } from "@/features/access/schemas/access.schema";
import { annulAccessRecord, getAccessRecord, updateAccessRecord } from "@/features/access/services/access.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
type Params = { params: Promise<{ id: string }> };
export async function GET(req: NextRequest, { params }: Params) { try { const user = await requireAuth(req); requirePermission(user, "access", "ver"); return NextResponse.json({ data: await getAccessRecord((await params).id) }); } catch (error) { return mapApiRouteError(error, "No pudimos cargar el acceso."); } }
export async function PATCH(req: NextRequest, { params }: Params) { try { const user = await requireAuth(req); requirePermission(user, "access", "editar"); const parsed = updateAccessSchema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ message: "Datos inválidos" }, { status: 400 }); return NextResponse.json({ data: await updateAccessRecord((await params).id, parsed.data.observations, user.id, getAuditRequestContext(req.headers)) }); } catch (error) { return mapApiRouteError(error, "No pudimos corregir el acceso."); } }
export async function DELETE(req: NextRequest, { params }: Params) { try { const user = await requireAuth(req); requirePermission(user, "access", "eliminar"); const parsed = annulAccessSchema.safeParse(await req.json()); if (!parsed.success) return NextResponse.json({ message: "El motivo es obligatorio." }, { status: 400 }); return NextResponse.json({ data: await annulAccessRecord((await params).id, parsed.data.reason, user.id, getAuditRequestContext(req.headers)) }); } catch (error) { return mapApiRouteError(error, "No pudimos anular el acceso."); } }
