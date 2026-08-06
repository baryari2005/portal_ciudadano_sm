import { NextRequest, NextResponse } from "next/server";
import { updateActivityScheduleSchema } from "@/features/activity-schedules/schemas/activity-schedule.schema";
import { changeActivityScheduleStatus, getActivitySchedule, updateActivitySchedule } from "@/features/activity-schedules/services/activity-schedules.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { notifyTeacherAssignmentChanges } from "@/features/teacher/services/teacher-assignment-notifications.server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };
const OPERATIONAL_FIELDS = new Set(["estado", "espacio", "observaciones", "cupoMaximo", "permiteListaEspera", "permiteSobrecupo", "sobrecupoMaximo", "profesoresIds", "profesorPrincipalId", "recursos"]);
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: Params) {
  try { const user = await requireAuth(req); requirePermission(user, "activity_schedules", "ver"); const data = await getActivitySchedule((await params).id); return data ? NextResponse.json({ data }) : NextResponse.json({ message: "Horario no encontrado" }, { status: 404 }); }
  catch (error) { return mapApiRouteError(error, "No pudimos cargar el horario."); }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req), body = await req.json(), keys = Object.keys(body);
    if (keys.some((key) => !OPERATIONAL_FIELDS.has(key))) return NextResponse.json({ message: "La actividad, sede, día y franja sólo pueden definirse desde el workflow de actividades." }, { status: 409 });
    requirePermission(user, "activity_schedules", "editar");
    if (keys.some((key) => ["profesoresIds", "profesorPrincipalId", "recursos"].includes(key))) requirePermission(user, "activity_schedules", "asignar");
    const parsed = updateActivityScheduleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    const id = (await params).id;
    const before = await getActivitySchedule(id);
    const data = await updateActivitySchedule(id, parsed.data, { actorId: user.id, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) });
    if (before && (parsed.data.profesoresIds !== undefined || parsed.data.profesorPrincipalId !== undefined)) {
      const users = await prisma.profesor.findMany({ where: { id: { in: data.professors.map((item: { id: string }) => item.id) } }, select: { id: true, usuarioId: true } });
      const userByProfessor = new Map(users.map((item) => [item.id, item.usuarioId]));
      await notifyTeacherAssignmentChanges(prisma, {
        previous: before.professors.map((item: { id: string; isPrimary: boolean }) => ({ professorId: item.id, isPrimary: item.isPrimary, userId: userByProfessor.get(item.id) ?? "" })),
        current: data.professors.map((item: { id: string; isPrimary: boolean }) => ({ professorId: item.id, isPrimary: item.isPrimary, userId: userByProfessor.get(item.id) ?? "" })),
        context: { kind: "schedule", entityId: data.id, activityName: data.activity.name, establishmentId: data.establishmentId, establishmentName: data.establishment.name, space: data.space, day: data.day, startTime: data.startTime, endTime: data.endTime },
        senderId: user.id,
        operationKey: `update:${before.updatedAt.toISOString()}`,
      });
    }
    return NextResponse.json({ data });
  } catch (error) { return mapApiRouteError(error, "No pudimos actualizar el horario."); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try { const user = await requireAuth(req); requirePermission(user, "activity_schedules", "eliminar"); return NextResponse.json({ data: await changeActivityScheduleStatus((await params).id, "CANCELADO", { actorId: user.id, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(req.headers) }) }); }
  catch (error) { return mapApiRouteError(error, "No pudimos cancelar el horario."); }
}
