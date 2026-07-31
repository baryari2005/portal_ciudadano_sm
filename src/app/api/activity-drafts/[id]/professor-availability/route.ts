import { NextRequest, NextResponse } from "next/server";
import { CatalogConflictError } from "@/lib/errors/catalog-errors";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { getActivityDraft } from "@/features/activity-workflow/services/activity-drafts.server";
import { assertActivityScheduleAvailability } from "@/features/activity-schedules/services/activity-schedules.server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(request);
    requirePermission(user, "actividades", "editar");
    const { professorId, schedules } = (await request.json()) as { professorId?: string; schedules?: Array<{ id?: string; diaSemana: string; horaInicio: string; horaFin: string }> };
    if (!professorId) return NextResponse.json({ message: "Seleccioná un profesor." }, { status: 400 });
    const draft = await getActivityDraft((await params).id);
    if (!draft) return NextResponse.json({ message: "Borrador no encontrado." }, { status: 404 });
    const schedulesToCheck = schedules?.length ? schedules : draft.payload.schedules;
    for (const schedule of schedulesToCheck) {
      try {
        await assertActivityScheduleAvailability({
          establishmentId: draft.payload.establecimientoId,
          diaSemana: schedule.diaSemana,
          horaInicio: schedule.horaInicio,
          horaFin: schedule.horaFin,
          espacio: null,
          profesoresIds: [professorId],
          recursos: [],
          excludeId: schedule.id,
        });
      } catch (error) {
        if (error instanceof CatalogConflictError) return NextResponse.json({ data: { available: false, message: error.message } });
        throw error;
      }
    }
    return NextResponse.json({ data: { available: true, message: null } });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos verificar la disponibilidad del profesor.");
  }
}
