import { Prisma } from "@prisma/client";
import { getAttendanceRoster, listAttendanceSessions } from "@/features/attendance/services/attendance.server";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { TEACHER_SESSION_ACCESS_DENIED_MESSAGE } from "../constants/teacher-errors";
import { createNotifications, getUnreadCount, listUserNotifications, notifyAdministrators } from "@/features/notifications/services/notifications.server";
import { listActivitySessions, getActivitySession } from "@/features/activity-sessions/services/activity-sessions.server";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import type { ActivitySessionStatus } from "@/features/activity-sessions/types/activity-session.types";
import { getEnrollmentDocumentationSummaries } from "@/features/enrollment-documents/services/enrollment-documents.server";

export class TeacherSessionAccessError extends Error {
  readonly status = 403;

  constructor() {
    super(TEACHER_SESSION_ACCESS_DENIED_MESSAGE);
    this.name = "TeacherSessionAccessError";
  }
}

const teacherSessionAssignment = (professorId: string): Prisma.ClaseActividadWhereInput => ({
  profesores: { some: { profesorId: professorId } },
});

export async function listTeacherEstablishments(userId: string) {
  const teacher = await requireTeacherProfile(userId);
  const establishments = await prisma.establecimiento.findMany({
    where: {
      activo: true,
      OR: [
        { horariosActividad: { some: { profesores: { some: { profesorId: teacher.id } } } } },
        { clases: { some: { profesores: { some: { profesorId: teacher.id } } } } },
      ],
    },
    select: { id: true, nombre: true, direccion: true },
    orderBy: { nombre: "asc" },
  });
  const start = new Date(); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(end.getDate()+1);
  const counts = await prisma.claseActividad.groupBy({ by: ["establecimientoId"], where: { establecimientoId: { in: establishments.map((item) => item.id) }, fecha: { gte: start, lt: end }, ...teacherSessionAssignment(teacher.id) }, _count: { id: true } });
  const countById = new Map(counts.map((item) => [item.establecimientoId,item._count.id]));
  return establishments.map((item) => ({ ...item, todayClassCount: countById.get(item.id) ?? 0 }));
}

export async function assertTeacherEstablishment(userId: string, establishmentId: string) {
  const allowed = await listTeacherEstablishments(userId);
  if (!allowed.some((item) => item.id === establishmentId)) throw new TeacherSessionAccessError();
}

export async function requireTeacherProfile(userId: string) {
  const teacher = await prisma.profesor.findUnique({ where: { usuarioId: userId }, include: { usuario: { select: { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true, email: true, estado: true } } } });
  if (!teacher) throw new CatalogValidationError("Tu usuario no posee un perfil de profesor.");
  if (teacher.estado !== "ACTIVO") throw new CatalogValidationError("Tu perfil de profesor no se encuentra activo.");
  return teacher;
}

export async function assertTeacherSession(userId: string, sessionId: string, establishmentId?: string) {
  const teacher = await requireTeacherProfile(userId);
  const session = await prisma.claseActividad.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) throw new CatalogNotFoundError("Clase no encontrada.");
  const assigned = await prisma.claseActividad.findFirst({ where: { id: sessionId, ...(establishmentId ? { establecimientoId: establishmentId } : {}), ...teacherSessionAssignment(teacher.id) }, select: { id: true } });
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

export async function listTeacherSchedules(userId: string, establishmentId: string) {
  const teacher = await requireTeacherProfile(userId);
  await assertTeacherEstablishment(userId, establishmentId);
  const rows = await prisma.horarioActividad.findMany({ where: { establecimientoId: establishmentId, profesores: { some: { profesorId: teacher.id } } }, include: { actividad: { select: { id: true, nombre: true } }, establecimiento: { select: { id: true, nombre: true } }, profesores: { where: { profesorId: teacher.id }, select: { esPrincipal: true } }, clases: { where: { fecha: { gte: new Date() }, estado: { in: ["PROGRAMADA", "EN_CURSO"] } }, orderBy: { fecha: "asc" }, take: 1, select: { id: true, fecha: true, horaInicio: true } } }, orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] });
  return rows.map((row) => ({ id: row.id, activity: row.actividad, day: row.diaSemana, startTime: row.horaInicio, endTime: row.horaFin, establishment: row.establecimiento, space: row.espacio, status: row.estado, capacity: row.cupoMaximo, isPrimary: row.profesores[0]?.esPrincipal ?? false, nextSession: row.clases[0] ?? null }));
}

export async function listTeacherSessions(userId: string, filters: { search?: string; attendanceState?: "PENDING"|"OPEN"|"CLOSED"; status?: string; activityId?: string; establishmentId?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
  const teacher = await requireTeacherProfile(userId);
  if (!filters.establishmentId) throw new CatalogValidationError("Seleccioná un establecimiento para continuar.");
  await assertTeacherEstablishment(userId, filters.establishmentId);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return listAttendanceSessions({ professorId: teacher.id, includeScheduleAssignments: false, search: filters.search, attendanceState: filters.attendanceState, status: filters.status, activityId: filters.activityId, establishmentId: filters.establishmentId, dateFrom: filters.dateFrom ?? today, dateTo: filters.dateTo, page: filters.page ?? 1, pageSize: filters.pageSize ?? 8 } as Parameters<typeof listAttendanceSessions>[0]);
}

export async function listTeacherClasses(userId: string, filters: { search?: string; status?: ActivitySessionStatus; participation?: "WITH"|"WITHOUT"; establishmentId: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number }) {
  const teacher = await requireTeacherProfile(userId);
  await assertTeacherEstablishment(userId, filters.establishmentId);
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(threshold);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const visibleAfter = { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
  return listActivitySessions({ ...filters, professorId: teacher.id, includeScheduleAssignments: false, visibleAfter, excludedStatuses: ["CANCELADA"], page: filters.page ?? 1, pageSize: filters.pageSize ?? 8 });
}

export async function listTeacherEnrollees(userId: string, filters: { establishmentId: string; search?: string; page?: number; pageSize?: number }) {
  const teacher = await requireTeacherProfile(userId);
  await assertTeacherEstablishment(userId, filters.establishmentId);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 8;
  const search = filters.search?.trim();
  const assignedClass = { some: { establecimientoId: filters.establishmentId, profesores: { some: { profesorId: teacher.id } } } };
  const where: Prisma.InscripcionWhereInput = {
    estado: { in: ["PENDIENTE", "CONFIRMADA", "LISTA_ESPERA"] },
    OR: [
      { horarioActividad: { clases: assignedClass } },
      { horarios: { some: { horarioActividad: { clases: assignedClass } } } },
    ],
    ...(search ? { usuario: { OR: [
      { nombre: { contains: search, mode: "insensitive" } },
      { apellido: { contains: search, mode: "insensitive" } },
      { documento: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ] } } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.inscripcion.count({ where }),
    prisma.inscripcion.findMany({
      where,
      select: {
        id: true,
        estado: true,
        fechaInscripcion: true,
        usuario: { select: { id: true, userId: true, nombre: true, apellido: true, documento: true, email: true, celular: true, domicilio: true, avatarUrl: true } },
        horarioActividad: { select: { actividad: { select: { id: true, nombre: true } }, establecimiento: { select: { id: true, nombre: true } } } },
      },
      orderBy: [{ usuario: { apellido: "asc" } }, { usuario: { nombre: "asc" } }, { fechaInscripcion: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  const documentation = await getEnrollmentDocumentationSummaries(rows.map((row) => row.id));
  return {
    items: rows.map((row) => ({
      id: row.id,
      status: row.estado,
      enrollmentDate: row.fechaInscripcion.toISOString(),
      citizen: { id: row.usuario.id, userId: row.usuario.userId, firstName: row.usuario.nombre, lastName: row.usuario.apellido, documentNumber: row.usuario.documento, email: row.usuario.email, phone: row.usuario.celular, address: row.usuario.domicilio, avatarUrl: row.usuario.avatarUrl },
      activity: row.horarioActividad.actividad,
      establishment: row.horarioActividad.establecimiento,
      documentation: documentation.get(row.id) ?? null,
    })),
    meta: { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

export async function assertTeacherCitizenAccess(userId: string, citizenId: string, establishmentId: string) {
  const teacher = await requireTeacherProfile(userId);
  await assertTeacherEstablishment(userId, establishmentId);
  const linked = await prisma.inscripcion.count({ where: { usuarioId: citizenId, OR: [{ horarioActividad: { clases: { some: { establecimientoId: establishmentId, profesores: { some: { profesorId: teacher.id } } } } } }, { horarios: { some: { horarioActividad: { clases: { some: { establecimientoId: establishmentId, profesores: { some: { profesorId: teacher.id } } } } } } } }] } });
  if (!linked) throw new TeacherSessionAccessError();
}

export async function assertTeacherEnrollmentAccess(userId: string, enrollmentId: string, establishmentId: string) {
  const teacher = await requireTeacherProfile(userId);
  await assertTeacherEstablishment(userId, establishmentId);
  const linked = await prisma.inscripcion.count({ where: { id: enrollmentId, OR: [{ horarioActividad: { clases: { some: { establecimientoId: establishmentId, profesores: { some: { profesorId: teacher.id } } } } } }, { horarios: { some: { horarioActividad: { clases: { some: { establecimientoId: establishmentId, profesores: { some: { profesorId: teacher.id } } } } } } } }] } });
  if (!linked) throw new TeacherSessionAccessError();
}

export async function getTeacherClass(userId: string, sessionId: string, establishmentId: string) {
  await assertTeacherSession(userId, sessionId, establishmentId);
  const item = await getActivitySession(sessionId);
  if (!item) throw new CatalogNotFoundError("Clase no encontrada.");
  return item;
}

export async function suspendTeacherClass(input: { userId: string; sessionId: string; establishmentId: string; reason: string; requestContext?: { ip?: string | null; userAgent?: string | null } }) {
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 500) throw new CatalogValidationError("El motivo debe tener entre 10 y 500 caracteres.");
  const teacher = await assertTeacherSession(input.userId, input.sessionId, input.establishmentId);
  return prisma.$transaction(async (tx) => {
    const current = await tx.claseActividad.findUnique({ where: { id: input.sessionId }, include: { establecimiento: true, horarioActividad: { include: { actividad: true } }, reservas: { where: { estado: { in: ["RESERVADA", "LISTA_ESPERA", "OFRECIDA"] } }, select: { usuarioId: true } }, profesores: { where: { profesorId: teacher.id }, select: { id: true } } } });
    if (!current) throw new CatalogNotFoundError("Clase no encontrada.");
    if (!current.profesores.length) throw new TeacherSessionAccessError();
    if (current.estado === "SUSPENDIDA") throw new CatalogValidationError("Esta clase ya se encuentra suspendida.");
    if (["CANCELADA", "FINALIZADA"].includes(current.estado) || current.asistenciaCerradaAt) throw new CatalogValidationError("No se puede suspender una clase cerrada o finalizada.");
    const today = new Date(); today.setHours(0,0,0,0);
    if (current.fecha < today) throw new CatalogValidationError("No se puede suspender una clase pasada.");
    const changed = await tx.claseActividad.updateMany({ where: { id: current.id, estado: { in: ["PROGRAMADA", "EN_CURSO"] } }, data: { estado: "SUSPENDIDA", motivoCancelacion: reason } });
    if (changed.count !== 1) throw new CatalogValidationError("La clase cambió de estado y ya no puede suspenderse.");
    await tx.bloqueoRecurso.deleteMany({ where: { claseActividadId: current.id } });
    const professorName = [teacher.usuario.nombre, teacher.usuario.apellido].filter(Boolean).join(" ") || "Un profesor";
    const date = current.fecha.toISOString().slice(0,10);
    const scheduleEnrollments = current.horarioActividad.actividad.modalidadInscripcion === "POR_CLASE" ? [] : await tx.inscripcion.findMany({ where: { estado: { in: ["PENDIENTE", "CONFIRMADA", "LISTA_ESPERA"] }, OR: [{ horarioActividadId: current.horarioActividadId }, { horarios: { some: { horarioActividadId: current.horarioActividadId } } }], AND: [{ OR: [{ fechaInicio: null }, { fechaInicio: { lte: current.fecha } }] }, { OR: [{ fechaFin: null }, { fechaFin: { gte: current.fecha } }] }] }, select: { usuarioId: true } });
    const citizenIds = [...new Set([...scheduleEnrollments.map((item) => item.usuarioId), ...current.reservas.map((item) => item.usuarioId)])];
    await createNotifications(citizenIds.map((userId) => ({ userId, senderId: input.userId, type: "CLASE_SUSPENDIDA", title: "Clase suspendida", message: `La clase de ${current.horarioActividad.actividad.nombre} del ${date} de ${current.horaInicio} a ${current.horaFin} fue suspendida. Motivo: ${reason}.`, priority: "ALTA", actionUrl: "/citizen/enrollments", actionLabel: "Ver mis inscripciones", entityType: "activity_session", entityId: current.id, metadata: { activityId: current.horarioActividad.actividadId, scheduleId: current.horarioActividadId, establishmentId: current.establecimientoId, teacherId: teacher.id, reason }, deduplicationKey: `teacher-suspension-citizen:${current.id}:${current.updatedAt.getTime()}:${userId}` })), tx);
    await notifyAdministrators({ senderId: input.userId, type: "CLASE_SUSPENDIDA", title: "Clase suspendida por un profesor", message: `${professorName} suspendió la clase de ${current.horarioActividad.actividad.nombre} del ${date} de ${current.horaInicio} a ${current.horaFin}. Motivo: ${reason}.`, priority: "ALTA", actionUrl: `/activity-sessions?sessionId=${current.id}`, actionLabel: "Ver clase", entityType: "activity_session", entityId: current.id, metadata: { activityId: current.horarioActividad.actividadId, scheduleId: current.horarioActividadId, establishmentId: current.establecimientoId, teacherId: teacher.id, reason }, deduplicationKey: `teacher-suspension-admin:${current.id}:${current.updatedAt.getTime()}` }, tx);
    await createAuditLog({ actorId: input.userId, action: "SUSPENDER", entityType: "CLASE_ACTIVIDAD", entityId: current.id, entityName: `Clase de ${current.horarioActividad.actividad.nombre} · ${date}`, changes: { status: { before: current.estado, after: "SUSPENDIDA" }, cancellationReason: { before: current.motivoCancelacion, after: reason } }, metadata: { teacherId: teacher.id, establishmentId: current.establecimientoId, reason }, origin: "ADMINISTRACION", requestContext: input.requestContext }, tx);
    return { id: current.id, status: "SUSPENDIDA" as const, cancellationReason: reason };
  });
}

export async function getTeacherSession(userId: string, sessionId: string, establishmentId: string) {
  await assertTeacherSession(userId, sessionId, establishmentId);
  const roster = await getAttendanceRoster(sessionId);
  const documentation = await getEnrollmentDocumentationSummaries(roster.attendees.map((item) => item.enrollmentId));
  return { ...roster, attendees: roster.attendees.map((item) => ({ ...item, documentation: documentation.get(item.enrollmentId) ?? null })) };
}

export async function getTeacherSummary(userId: string, establishmentId: string) {
  const teacher = await requireTeacherProfile(userId);
  await assertTeacherEstablishment(userId, establishmentId);
  const today = new Date(); today.setHours(0, 0, 0, 0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const ownership = { establecimientoId: establishmentId, ...teacherSessionAssignment(teacher.id) };
  const sessionSummaryInclude = { horarioActividad: { include: { actividad: { select: { nombre: true, imagenUrl: true } }, inscripciones: { where: { estado: "CONFIRMADA" as const }, select: { id: true } } } }, establecimiento: { select: { nombre: true } } };
  const [todaySessions, todayClasses, upcomingSessions, nextSession, pendingRosters, unreadCount, schedulesChanged] = await Promise.all([
    prisma.claseActividad.count({ where: { ...ownership, fecha: { gte: today, lt: tomorrow } } }),
    prisma.claseActividad.findMany({ where: { ...ownership, fecha: { gte: today, lt: tomorrow } }, include: sessionSummaryInclude, orderBy: { horaInicio: "asc" } }),
    prisma.claseActividad.count({ where: { ...ownership, fecha: { gte: today }, estado: { in: ["PROGRAMADA", "EN_CURSO"] } } }),
    prisma.claseActividad.findFirst({ where: { ...ownership, fecha: { gte: today }, estado: { in: ["PROGRAMADA", "EN_CURSO"] } }, include: sessionSummaryInclude, orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }] }),
    prisma.claseActividad.count({ where: { ...ownership, fecha: { lt: tomorrow }, estado: { in: ["PROGRAMADA", "EN_CURSO", "FINALIZADA"] }, asistenciaCerradaAt: null } }),
    getUnreadCount(userId),
    prisma.horarioActividad.count({ where: { establecimientoId: establishmentId, profesores: { some: { profesorId: teacher.id } }, estado: { in: ["SUSPENDIDO", "CANCELADO"] } } }),
  ]);
  const mapSession = (session: NonNullable<typeof nextSession>) => ({ id: session.id, date: session.fecha, startTime: session.horaInicio, endTime: session.horaFin, activityName: session.horarioActividad.actividad.nombre, activityImageUrl: session.horarioActividad.actividad.imagenUrl, establishmentName: session.establecimiento.nombre, space: session.espacio, status: session.estado, confirmedCount: session.horarioActividad.inscripciones.length });
  return { todaySessions, upcomingSessions, pendingRosters, unreadCount, schedulesChanged, todayClasses: todayClasses.map(mapSession), nextSession: nextSession ? mapSession(nextSession) : null };
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
