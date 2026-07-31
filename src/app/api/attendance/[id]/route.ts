import { NextRequest, NextResponse } from "next/server";
import { updateAttendanceSchema } from "@/features/attendance/schemas/attendance.schema";
import { getAttendanceRoster, updateAttendance } from "@/features/attendance/services/attendance.server";
import { assertTeacherAttendance, assertTeacherSession, isTeacherRole } from "@/features/teacher/services/teacher.server";
import { mapApiRouteError } from "@/lib/api/route-error";
import { requireAuth, requirePermission } from "@/lib/server-auth";
import { assertAdministratorCanTakeAttendance, assertTeacherCanTakeAttendanceToday, isHistoricalAttendance } from "@/features/attendance/services/attendance-date-policy.server";

type P = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: P) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "attendance", "ver");
    const id = (await params).id;
    if (isTeacherRole(user)) await assertTeacherSession(user.id, id);
    return NextResponse.json({ data: await getAttendanceRoster(id) });
  } catch (error) { return mapApiRouteError(error, "No pudimos cargar la planilla."); }
}

export async function PATCH(req: NextRequest, { params }: P) {
  try {
    const user = await requireAuth(req);
    requirePermission(user, "attendance", "editar");
    const parsed = updateAttendanceSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    const id = (await params).id;
    if (isTeacherRole(user)) { const teacher = await assertTeacherAttendance(user.id, id); void teacher; const attendance = await import("@/lib/db").then(({prisma})=>prisma.asistencia.findUniqueOrThrow({where:{id},select:{claseActividadId:true}})); await assertTeacherCanTakeAttendanceToday(attendance.claseActividadId); }
    else { const attendance = await import("@/lib/db").then(({prisma})=>prisma.asistencia.findUniqueOrThrow({where:{id},select:{claseActividadId:true}})); await assertAdministratorCanTakeAttendance(attendance.claseActividadId); if(await isHistoricalAttendance(attendance.claseActividadId)&&!parsed.data.correctionReason?.trim())return NextResponse.json({message:"Indicá el motivo de la corrección histórica."},{status:400}); }
    return NextResponse.json({ data: await updateAttendance(id, parsed.data, user.id) });
  } catch (error) { return mapApiRouteError(error, "No pudimos modificar la asistencia."); }
}
