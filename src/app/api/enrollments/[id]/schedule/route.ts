import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { getCitizenActivity } from "@/features/citizen/services/citizen.server";
import {
  changeCitizenEnrollmentSchedules,
  getEnrollment,
  getEnrollmentSlotAvailability,
  updateEnrollment,
} from "@/features/enrollments/services/enrollments.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

type Params = { params: Promise<{ id: string }> };
const selectionSchema = z.object({
  activityScheduleId: z.string().min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
const availabilitySchema = z.object({ selections: z.array(selectionSchema).min(1).max(30) }).strict();
const updateSchema = availabilitySchema.extend({ observations: z.string().trim().max(1000).nullable().optional() });

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(request);
    requirePermission(actor, "enrollments", "ver");
    const enrollment = await getEnrollment((await params).id);
    if (!enrollment) return NextResponse.json({ message: "Inscripción no encontrada." }, { status: 404 });
    const activity = await getCitizenActivity(enrollment.user.id, enrollment.activitySchedule.activity.id);
    return NextResponse.json({ data: { enrollment, activity } });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar los horarios de la inscripción.");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(request);
    requirePermission(actor, "enrollments", "editar");
    const parsed = availabilitySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Seleccioná un horario válido." }, { status: 400 });
    const enrollment = await getEnrollment((await params).id);
    if (!enrollment) return NextResponse.json({ message: "Inscripción no encontrada." }, { status: 404 });
    const selections = parsed.data.selections.map((item) => ({ horarioActividadId: item.activityScheduleId, horaInicio: item.startTime, horaFin: item.endTime }));
    const data = await getEnrollmentSlotAvailability(selections, enrollment.user.id, enrollment.activitySchedule.activity.id);
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos verificar la disponibilidad del ciudadano.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAuth(request);
    requirePermission(actor, "enrollments", "editar");
    const id = (await params).id;
    const parsed = updateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Seleccioná al menos un horario." }, { status: 400 });
    const before = await getEnrollment(id);
    if (!before) return NextResponse.json({ message: "Inscripción no encontrada." }, { status: 404 });
    const selections = parsed.data.selections.map((item) => ({ horarioActividadId: item.activityScheduleId, horaInicio: item.startTime, horaFin: item.endTime }));
    let data = await changeCitizenEnrollmentSchedules(before.user.id, id, selections, { notifyAdministrators: false });
    if (parsed.data.observations !== undefined) data = await updateEnrollment(id, { observaciones: parsed.data.observations });
    await createAuditLog({
      actorId: actor.id,
      action: "EDITAR",
      entityType: "INSCRIPCION",
      entityId: id,
      entityName: `Inscripción en ${before.activitySchedule.activity.name}`,
      changes: {
        horarios: { before: before.selectedSchedules, after: data.selectedSchedules },
        observaciones: { before: before.observations, after: data.observations },
      },
      origin: "ADMINISTRACION",
      requestContext: getAuditRequestContext(request.headers),
    });
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos actualizar los horarios de la inscripción.");
  }
}
