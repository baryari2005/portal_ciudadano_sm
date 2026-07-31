import { prisma } from "@/lib/db";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";

const TIME_ZONE = "America/Argentina/Buenos_Aires";

export function attendanceLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export async function getAttendanceSessionDate(sessionId: string) {
  const session = await prisma.claseActividad.findUnique({ where: { id: sessionId }, select: { fecha: true } });
  if (!session) throw new CatalogNotFoundError("Clase no encontrada.");
  return session.fecha.toISOString().slice(0, 10);
}

export async function assertTeacherCanTakeAttendanceToday(sessionId: string) {
  if (await getAttendanceSessionDate(sessionId) !== attendanceLocalDate()) throw new CatalogValidationError("El profesor solo puede tomar asistencia el día de la clase.");
}

export async function assertAdministratorCanTakeAttendance(sessionId: string) {
  if (await getAttendanceSessionDate(sessionId) > attendanceLocalDate()) throw new CatalogValidationError("No se puede tomar asistencia de una clase futura.");
}

export async function isHistoricalAttendance(sessionId: string) {
  return (await getAttendanceSessionDate(sessionId)) < attendanceLocalDate();
}
