import { NextRequest, NextResponse } from "next/server";

import { getAuditRequestContext } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { AttendanceQrError, registerAttendanceQr } from "@/features/attendance-qr/services/attendance-qr.server";
import { attendanceQrRegisterSchema } from "@/features/attendance-qr/schemas/attendance-qr.schema";
import { assertTeacherSession } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";

type Params = { params: Promise<{ sessionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    const sessionId = (await params).sessionId;
    requirePermission(user, "attendance", "asignar");
    await assertTeacherSession(user.id, sessionId);
    const body = await req.json();
    const parsed = attendanceQrRegisterSchema.safeParse({ activitySessionId: sessionId, qrToken: body.qrToken });
    if (!parsed.success) return NextResponse.json({ message: "QR inválido" }, { status: 400 });
    const data = await registerAttendanceQr(sessionId, parsed.data.qrToken, user.id, { datePolicy: "TEACHER_TODAY", requestContext: getAuditRequestContext(req.headers) });
    if (!data.digitalQrConsumed && data.attendance) await createAuditLog({ actorId: user.id, action: "MARCAR_PRESENTE", entityType: "ASISTENCIA", entityId: data.attendance.id, entityName: "Asistencia QR · Portal del Profesor", origin: "QR", requestContext: getAuditRequestContext(req.headers) });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AttendanceQrError) return NextResponse.json({ result: error.code, message: error.message, ...(error.digitalQrConsumed ? { digitalQrConsumed: true } : {}) }, { status: error.status });
    return mapApiRouteError(error, "No pudimos registrar la asistencia por QR.");
  }
}
