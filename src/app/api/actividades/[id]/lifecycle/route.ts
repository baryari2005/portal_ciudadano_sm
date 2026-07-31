import { NextRequest, NextResponse } from "next/server";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { archiveActivity, getActivityDeletionPreview, purgeActivity } from "@/features/actividades/services/actividades.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try { const user = await requireAuth(req); requirePermission(user, "actividades", "eliminar"); return NextResponse.json({ data: await getActivityDeletionPreview((await params).id) }); }
  catch (error) { return mapApiRouteError(error, "No pudimos analizar la actividad."); }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req); requirePermission(user, "actividades", "eliminar");
    const id = (await params).id, body = await req.json(), reason = typeof body.reason === "string" ? body.reason : "";
    const preview = await getActivityDeletionPreview(id), data = await archiveActivity(id, reason);
    await createAuditLog({ actorId: user.id, action: "CANCELAR", entityType: "ACTIVIDAD", entityId: id, entityName: preview.name, changes: { estado: { before: preview.state, after: "CANCELADA" } }, metadata: { reason, cancelledSessions: data.cancelledSessions, notifiedUsers: data.notifiedUsers }, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json({ data });
  } catch (error) { return mapApiRouteError(error, "No pudimos dar de baja la actividad."); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req); requirePermission(user, "actividades", "eliminar");
    const id = (await params).id, body = await req.json(), preview = await getActivityDeletionPreview(id);
    if (body.confirmation !== preview.name) return NextResponse.json({ message: "Escribí el nombre exacto de la actividad para confirmar." }, { status: 400 });
    await purgeActivity(id);
    await createAuditLog({ actorId: user.id, action: "ELIMINAR", entityType: "ACTIVIDAD", entityId: id, entityName: preview.name, metadata: preview, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json({ ok: true });
  } catch (error) { return mapApiRouteError(error, "No pudimos eliminar definitivamente la actividad."); }
}
