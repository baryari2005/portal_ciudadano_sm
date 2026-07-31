import { NextRequest, NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { createEnrollmentSchema, enrollmentFiltersSchema } from "@/features/enrollments/schemas/enrollment.schema";
import { createEnrollment, listEnrollments } from "@/features/enrollments/services/enrollments.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requirePermission(user, "enrollments", "ver");
    const parsed = enrollmentFiltersSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ message: "Filtros inválidos", details: parsed.error.flatten() }, { status: 400 });
    const result = await listEnrollments(parsed.data);
    return NextResponse.json({ data: result.items, meta: result.meta });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos cargar las inscripciones.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    requirePermission(user, "enrollments", "crear");
    requirePermission(user, "enrollments", "asignar");
    const parsed = createEnrollmentSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    const data = await createEnrollment(parsed.data);
    await createAuditLog({
      actorId: user.id,
      action: "INSCRIBIR",
      entityType: "INSCRIPCION",
      entityId: data.id,
      entityName: `Inscripción en ${data.activitySchedule.activity.name}`,
      metadata: {
        activityId: parsed.data.actividadId ?? data.activitySchedule.activity.id,
        scheduleIds: parsed.data.horarioActividadIds ?? [data.activitySchedule.id],
        classId: parsed.data.claseActividadId ?? null,
        status: data.status,
      },
      origin: "ADMINISTRACION",
      requestContext: getAuditRequestContext(request.headers),
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return mapApiRouteError(error, "No pudimos crear la inscripción.");
  }
}
