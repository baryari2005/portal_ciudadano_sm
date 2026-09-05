import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getEnrollment, getEnrollmentSlotAvailability } from "@/features/enrollments/services/enrollments.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth } from "@/lib/server-auth";

const availabilitySchema = z.object({
  activityId: z.string().min(1),
  enrollmentId: z.string().min(1).optional(),
  selections: z.array(z.object({
    activityScheduleId: z.string().min(1),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })).min(1).max(30),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const parsed = availabilitySchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Seleccioná un horario válido." }, { status: 400 });
    const selections = parsed.data.selections.map((selection) => ({
      horarioActividadId: selection.activityScheduleId,
      horaInicio: selection.startTime,
      horaFin: selection.endTime,
    }));
    if (parsed.data.enrollmentId) {
      const enrollment = await getEnrollment(parsed.data.enrollmentId);
      if (!enrollment || enrollment.user.id !== user.id || enrollment.activitySchedule.activity.id !== parsed.data.activityId) {
        return NextResponse.json({ message: "La inscripción no corresponde a la actividad seleccionada." }, { status: 403 });
      }
    }
    const data = await getEnrollmentSlotAvailability(selections, user.id, parsed.data.activityId, parsed.data.enrollmentId);
    return NextResponse.json({ data });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos verificar tu disponibilidad para este horario.");
  }
}
