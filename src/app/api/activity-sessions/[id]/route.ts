import { NextRequest, NextResponse } from "next/server";
import { buildAuditChanges, getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { updateActivitySessionSchema } from "@/features/activity-sessions/schemas/activity-session.schema";
import { getActivitySession, updateActivitySession } from "@/features/activity-sessions/services/activity-sessions.server";
import { assertTeacherSession, isTeacherRole } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

type Params = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "activity_sessions", "ver");
    const id = (await params).id;
    if (isTeacherRole(user)) await assertTeacherSession(user.id, id);
    const data = await getActivitySession(id);
    return data ? NextResponse.json({ data }) : NextResponse.json({ message: "Clase no encontrada" }, { status: 404 });
  } catch (error) { return mapApiRouteError(error, "No pudimos cargar la clase."); }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    const id = (await params).id;
    const body = await req.json();
    const keys = Object.keys(body);
    if (keys.some((key) => !["status", "cancellationReason"].includes(key))) requirePermission(user, "activity_sessions", "editar");
    if (keys.includes("status")) requirePermission(user, "activity_sessions", "eliminar");
    if (keys.some((key) => ["establishmentId", "professorIds", "primaryProfessorId"].includes(key))) requirePermission(user, "activity_sessions", "asignar");
    const parsed = updateActivitySessionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    const before = await getActivitySession(id);
    const data = await updateActivitySession(id, parsed.data);
    const action = parsed.data.status === "CANCELADA" ? "CANCELAR" : parsed.data.status === "SUSPENDIDA" ? "SUSPENDER" : parsed.data.status === "FINALIZADA" ? "FINALIZAR" : parsed.data.status === "PROGRAMADA" && before?.status !== "PROGRAMADA" ? "REACTIVAR" : "EDITAR";
    await createAuditLog({ actorId: user.id, action, entityType: "CLASE_ACTIVIDAD", entityId: id, entityName: `Clase de ${data.activitySchedule.activity.name} · ${data.date}`, changes: buildAuditChanges((before ?? {}) as Record<string, unknown>, data as Record<string, unknown>, ["status", "cancellationReason"]), metadata: parsed.data.cancellationReason ? { reason: parsed.data.cancellationReason } : undefined, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json({ data });
  } catch (error) { return mapApiRouteError(error, "No pudimos actualizar la clase."); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    const id = (await params).id;
    requirePermission(user, "activity_sessions", "eliminar");
    const body = await req.json().catch(() => ({}));
    const reason = typeof body.cancellationReason === "string" ? body.cancellationReason.trim() : "";
    if (reason.length < 3) return NextResponse.json({ message: "Indicá el motivo de cancelación." }, { status: 400 });
    const before = await getActivitySession(id);
    const data = await updateActivitySession(id, { status: "CANCELADA", cancellationReason: reason });
    await createAuditLog({ actorId: user.id, action: "CANCELAR", entityType: "CLASE_ACTIVIDAD", entityId: id, entityName: before ? `Clase de ${before.activitySchedule.activity.name} · ${before.date}` : null, changes: { status: { before: before?.status ?? null, after: "CANCELADA" } }, metadata: { cancellationReason: reason }, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json({ data });
  } catch (error) { return mapApiRouteError(error, "No pudimos cancelar la clase."); }
}
