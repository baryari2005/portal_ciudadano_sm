import { Prisma } from "@prisma/client";
import { getAttendanceRoster, listAttendanceSessions } from "@/features/attendance/services/attendance.server";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { TEACHER_SESSION_ACCESS_DENIED_MESSAGE } from "../constants/teacher-errors";
import { getUnreadCount, listUserNotifications } from "@/features/notifications/services/notifications.server";

export class TeacherSessionAccessError extends Error {
  readonly status = 403;

  constructor() {
    super(TEACHER_SESSION_ACCESS_DENIED_MESSAGE);
    this.name = "TeacherSessionAccessError";
  }
}

const teacherSessionAssignment = (professorId: string): Prisma.ClaseActividadWhereInput => ({
  OR: [
    { profesores: { some: { profesorId: professorId } } },
    { horarioActividad: { profesores: { some: { profesorId: professorId } } } },
  ],
});

export async function requireTeacherProfile(userId: string) {
  const teacher = await prisma.profesor.findUnique({ where: { usuarioId: userId }, include: { usuario: { select: { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true, email: true, estado: true } } } });
  if (!teacher) throw new CatalogValidationError("Tu usuario no posee un perfil de profesor.");
  if (teacher.estado !== "ACTIVO") throw new CatalogValidationError("Tu perfil de profesor no se encuentra activo.");
  return teacher;
}

export async function assertTeacherSession(userId: string, sessionId: string) {
  const teacher = await requireTeacherProfile(userId);
  const session = await prisma.claseActividad.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) throw new CatalogNotFoundError("Clase no encontrada.");
  const assigned = await prisma.claseActividad.findFirst({ where: { id: sessionId, ...teacherSessionAssignment(teacher.id) }, select: { id: true } });
  if (!assigned) throw new TeacherSessionAccessError();
  return teacher;
}

export async function assertTeacherAttendance(userId: string, attendanceId: string) {
  const attendance = await prisma.asistencia.findUnique({ where: { id: attendanceId }, select: { claseActividadId: true } });
  if (!attendance) throw new CatalogNotFoundError("Asistencia no encontrada.");
  return assertTeacherSession(userId, attendance.claseActividadId);
}

export function isTeacherRole(user: { rol: { codigo: string } | null }) {
  return user.rol?.codigo === "teacher";
}

export async function listTeacherSchedules(userId: string) {
  const teacher = await requireTeacherProfile(userId);
  const rows = await prisma.horarioActividad.findMany({ where: { profesores: { some: { profesorId: teacher.id } } }, include: { actividad: { select: { id: true, nombre: true } }, establecimiento: { select: { id: true, nombre: true } }, profesores: { where: { profesorId: teacher.id }, select: { esPrincipal: true } }, clases: { where: { fecha: { gte: new Date() }, estado: { in: ["PROGRAMADA", "EN_CURSO"] } }, orderBy: { fecha: "asc" }, take: 1, select: { id: true, fecha: true, horaInicio: true } } }, orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] });
  return rows.map((row) => ({ id: row.id, activity: row.actividad, day: row.diaSemana, startTime: row.horaInicio, endTime: row.horaFin, establishment: row.establecimiento, space: row.espacio, status: row.estado, capacity: row.cupoMaximo, isPrimary: row.profesores[0]?.esPrincipal ?? false, nextSession: row.clases[0] ?? null }));
}

export async function listTeacherSessions(userId: string, filters: { status?: string; activityId?: string; establishmentId?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
  const teacher = await requireTeacherProfile(userId);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return listAttendanceSessions({ professorId: teacher.id, includeScheduleAssignments: true, status: filters.status, activityId: filters.activityId, establishmentId: filters.establishmentId, dateFrom: today, dateTo: today, page: filters.page ?? 1, pageSize: filters.pageSize ?? 8 } as Parameters<typeof listAttendanceSessions>[0]);
}

export async function getTeacherSession(userId: string, sessionId: string) {
  await assertTeacherSession(userId, sessionId);
  return getAttendanceRoster(sessionId);
}

export async function getTeacherSummary(userId: string) {
  const teacher = await requireTeacherProfile(userId);
  const today = new Date(); today.setHours(0, 0, 0, 0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const ownership = teacherSessionAssignment(teacher.id);
  const [todaySessions, nextSession, pendingRosters, unreadCount, schedulesChanged] = await Promise.all([
    prisma.claseActividad.count({ where: { ...ownership, fecha: { gte: today, lt: tomorrow } } }),
    prisma.claseActividad.findFirst({ where: { ...ownership, fecha: { gte: today }, estado: { in: ["PROGRAMADA", "EN_CURSO"] } }, include: { horarioActividad: { include: { actividad: { select: { nombre: true } }, inscripciones: { where: { estado: "CONFIRMADA" }, select: { id: true } } } }, establecimiento: { select: { nombre: true } } }, orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }] }),
    prisma.claseActividad.count({ where: { ...ownership, fecha: { lt: tomorrow }, estado: { in: ["PROGRAMADA", "EN_CURSO", "FINALIZADA"] }, asistenciaCerradaAt: null } }),
    getUnreadCount(userId),
    prisma.horarioActividad.count({ where: { profesores: { some: { profesorId: teacher.id } }, estado: { in: ["SUSPENDIDO", "CANCELADO"] } } }),
  ]);
  return { todaySessions, pendingRosters, unreadCount, schedulesChanged, nextSession: nextSession ? { id: nextSession.id, date: nextSession.fecha, startTime: nextSession.horaInicio, activityName: nextSession.horarioActividad.actividad.nombre, establishmentName: nextSession.establecimiento.nombre, confirmedCount: nextSession.horarioActividad.inscripciones.length } : null };
}

export async function getTeacherNotifications(userId: string, page = 1) {
  await requireTeacherProfile(userId);
  return listUserNotifications(userId, { page, pageSize: 20 });
}

export async function getTeacherProfile(userId: string) {
  return requireTeacherProfile(userId);
}

export async function updateTeacherProfile(userId: string, input: { description?: string | null; photoUrl?: string | null }) {
  const teacher = await requireTeacherProfile(userId);
  return prisma.profesor.update({ where: { id: teacher.id }, data: { descripcion: input.description?.trim() || null, fotoUrl: input.photoUrl?.trim() || null }, include: { usuario: { select: { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true, email: true, estado: true } } } });
}
