import { NextRequest, NextResponse } from "next/server";
import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { attendanceQrRegisterSchema } from "@/features/attendance-qr/schemas/attendance-qr.schema";
import { AttendanceQrError, registerAttendanceQr } from "@/features/attendance-qr/services/attendance-qr.server";
import { assertAdministratorCanTakeAttendance, assertTeacherCanTakeAttendanceToday } from "@/features/attendance/services/attendance-date-policy.server";
import { assertTeacherSession, isTeacherRole } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "attendance", "asignar");
    const parsed = attendanceQrRegisterSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ result: "INVALID_QR", message: "Datos inválidos." }, { status: 400 });
    if (isTeacherRole(user)) {
      await assertTeacherSession(user.id, parsed.data.activitySessionId);
      await assertTeacherCanTakeAttendanceToday(parsed.data.activitySessionId);
    } else {
      await assertAdministratorCanTakeAttendance(parsed.data.activitySessionId);
    }
    const data = await registerAttendanceQr(parsed.data.activitySessionId, parsed.data.qrToken, user.id);
    if (data.result === "REGISTERED" && data.attendance && data.user && data.enrollment) await createAuditLog({ actorId: user.id, action: "MARCAR_PRESENTE", entityType: "ASISTENCIA", entityId: data.attendance.id, entityName: `Asistencia QR · ${[data.user.firstName, data.user.lastName].filter(Boolean).join(" ")}`, metadata: { sessionId: parsed.data.activitySessionId, enrollmentId: data.enrollment.id }, origin: "QR", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AttendanceQrError) return NextResponse.json({ result: error.code, message: error.message }, { status: error.status });
    return mapApiRouteError(error, "No pudimos registrar la asistencia.");
  }
}
