import { prisma } from "@/lib/db";
import { CatalogValidationError } from "@/lib/errors/catalog-errors";
import { attendanceLocalDate } from "./attendance-date-policy.server";
import { closeAttendance } from "./attendance.server";

export async function closeOverdueAttendanceRosters() {
  const actorId = process.env.ATTENDANCE_SYSTEM_ACTOR_ID;
  if (!actorId) throw new CatalogValidationError("Falta configurar ATTENDANCE_SYSTEM_ACTOR_ID.");
  const today = new Date(`${attendanceLocalDate()}T00:00:00.000Z`);
  const sessions = await prisma.claseActividad.findMany({ where: { fecha: { lt: today }, asistenciaCerradaAt: null, estado: { in: ["PROGRAMADA", "EN_CURSO", "FINALIZADA"] } }, select: { id: true }, orderBy: { fecha: "asc" } });
  const errors: string[] = [];
  let closed = 0;
  for (const session of sessions) {
    try { await closeAttendance(session.id, actorId); closed += 1; }
    catch { errors.push(session.id); }
  }
  return { found: sessions.length, closed, errors };
}
