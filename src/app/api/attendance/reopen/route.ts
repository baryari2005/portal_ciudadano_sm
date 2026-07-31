import { NextRequest, NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { attendanceSessionActionSchema } from "@/features/attendance/schemas/attendance.schema";
import { assertAdministratorCanTakeAttendance } from "@/features/attendance/services/attendance-date-policy.server";
import { reopenAttendance } from "@/features/attendance/services/attendance.server";
import { isTeacherRole } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    if (isTeacherRole(user)) return NextResponse.json({ message: "Solo administración puede reabrir una planilla." }, { status: 403 });
    requirePermission(user, "attendance", "eliminar");
    const parsed = attendanceSessionActionSchema.safeParse(await request.json());
    if (!parsed.success || !parsed.data.correctionReason?.trim()) return NextResponse.json({ message: "Indicá el motivo para reabrir la planilla." }, { status: 400 });
    await assertAdministratorCanTakeAttendance(parsed.data.activitySessionId);
    const data = await reopenAttendance(parsed.data.activitySessionId);
    await createAuditLog({ actorId: user.id, action: "REABRIR", entityType: "ASISTENCIA", entityId: parsed.data.activitySessionId, entityName: `Planilla · ${data.session.activity.name}`, metadata: { correctionReason: parsed.data.correctionReason }, origin: "ADMINISTRACION", requestContext: getAuditRequestContext(request.headers) });
    return NextResponse.json({ data });
  } catch (error) { return mapApiRouteError(error, "No pudimos reabrir la asistencia."); }
}
