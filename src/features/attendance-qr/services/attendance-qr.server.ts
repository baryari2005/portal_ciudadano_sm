import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashQrToken } from "./qr-credentials.server";
import { serializableTransaction } from "@/lib/db/serializable-transaction";
import { createAuditLogTx, type CreateAuditLogInput } from "@/features/audit-log/services/audit-log.server";
import { attendanceLocalDate } from "@/features/attendance/services/attendance-date-policy.server";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import type { AttendanceQrResult, AttendanceQrResultCode } from "../types/attendance-qr.types";

export class AttendanceQrError extends Error {
  constructor(public code: AttendanceQrResultCode, message: string, public status = 422, public digitalQrConsumed?: true) { super(message); }
}

const early = Number(process.env.QR_ATTENDANCE_EARLY_MINUTES ?? 30);
const late = Number(process.env.QR_ATTENDANCE_LATE_MINUTES ?? 60);
const localDateTime = (date: Date, time: string) => new Date(`${date.toISOString().slice(0, 10)}T${time}:00-03:00`);

const credentialUserSelect = { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true, deletedAt: true, estadoParticipacion: true } satisfies Prisma.UsuarioSelect;
type Credential = { id: string; usuarioId: string; estado: string; usuario: Prisma.UsuarioGetPayload<{ select: typeof credentialUserSelect }> };
type RegisterQrOptions = { datePolicy?: "TEACHER_TODAY" | "ADMIN_NOT_FUTURE"; requestContext?: CreateAuditLogInput["requestContext"] };
type QrOutcome = { data: AttendanceQrResult } | { rejection: AttendanceQrError };

async function sessionDateRejection(tx: Prisma.TransactionClient, sessionId: string, policy: RegisterQrOptions["datePolicy"]) {
  if (!policy) return null;
  const session = await tx.claseActividad.findUnique({ where: { id: sessionId }, select: { fecha: true } });
  if (!session) return new AttendanceQrError("SESSION_NOT_AVAILABLE", "Clase no encontrada.", 404);
  const date = session.fecha.toISOString().slice(0, 10), today = attendanceLocalDate();
  if (policy === "TEACHER_TODAY" && date !== today) return new AttendanceQrError("SESSION_NOT_AVAILABLE", "El profesor solo puede tomar asistencia el día de la clase.", 400);
  if (policy === "ADMIN_NOT_FUTURE" && date > today) return new AttendanceQrError("SESSION_NOT_AVAILABLE", "No se puede tomar asistencia de una clase futura.", 400);
  return null;
}

export async function registerAttendanceQr(activitySessionId: string, qrToken: string, actorId: string, options: RegisterQrOptions = {}): Promise<AttendanceQrResult> {
  const outcome = await serializableTransaction<QrOutcome>(prisma, async (tx) => {
    const tokenHash = hashQrToken(qrToken);
    const persistent = await tx.usuarioQrCredencial.findUnique({ where: { tokenHash }, include: { usuario: { select: credentialUserSelect } } });
    const digital = persistent ? null : await tx.accesoQrDigital.findUnique({ where: { tokenHash }, include: { usuario: { select: credentialUserSelect } } });

    if (!digital) {
      // Preserve the original endpoint date rejection and persistent credential behavior.
      const dateError = await sessionDateRejection(tx, activitySessionId, options.datePolicy);
      if (dateError?.status === 404) throw new CatalogNotFoundError(dateError.message);
      if (dateError) throw new CatalogValidationError(dateError.message);
      if (!persistent) throw new AttendanceQrError("INVALID_QR", "QR inválido.");
      return { data: await recordAttendance(tx, persistent, activitySessionId, actorId, true) };
    }
    if (digital.estado === "REVOCADO") throw new AttendanceQrError("REVOKED_QR", "La credencial QR fue revocada.");
    if (digital.estado === "CONSUMIDO") throw new AttendanceQrError("CONSUMED_QR", "El QR digital ya fue utilizado. Generá uno nuevo.", 409);

    const consumedAt = new Date();
    const consumed = await tx.accesoQrDigital.updateMany({ where: { id: digital.id, estado: "ACTIVO" }, data: { estado: "CONSUMIDO", consumidoAt: consumedAt } });
    if (consumed.count !== 1) throw new AttendanceQrError("CONSUMED_QR", "El QR digital ya no está disponible. Generá uno nuevo.", 409);

    let result: QrOutcome;
    try {
      const dateError = await sessionDateRejection(tx, activitySessionId, options.datePolicy);
      if (dateError) throw dateError;
      result = { data: await recordAttendance(tx, digital, activitySessionId, actorId, false) };
    } catch (error) {
      // Only predicted attendance rejections commit the consumption. Prisma and
      // all other technical failures escape this transaction and roll it back.
      if (!(error instanceof AttendanceQrError)) throw error;
      result = { rejection: new AttendanceQrError(error.code, `${error.message} El QR fue consumido; deberá generar uno nuevo.`, error.status, true) };
    }
    const code = "data" in result ? result.data.result : result.rejection.code;
    const metadata = { flow: "ATTENDANCE_DIGITAL_QR", credentialId: digital.id, userId: digital.usuarioId, sessionId: activitySessionId, result: code, consumedAt: consumedAt.toISOString(), attendanceId: "data" in result ? result.data.attendance?.id : undefined };
    await createAuditLogTx(tx, { actorId, action: "data" in result ? "CREAR" : "RECHAZAR", entityType: "CREDENCIAL_QR", entityId: digital.id, entityName: "Consumo QR digital · Asistencia", origin: "QR", metadata, requestContext: options.requestContext });
    if ("data" in result) {
      if (result.data.result === "REGISTERED" && result.data.attendance) await createAuditLogTx(tx, { actorId, action: "MARCAR_PRESENTE", entityType: "ASISTENCIA", entityId: result.data.attendance.id, entityName: "Asistencia QR digital", origin: "QR", metadata, requestContext: options.requestContext });
      return { data: { ...result.data, message: `${result.data.message} El QR digital fue consumido y no puede reutilizarse.`, digitalQrConsumed: true } };
    }
    return result;
  });
  // Rejection is surfaced only after the successful commit, never by throwing
  // inside the transaction that must retain the one-attempt consumption.
  if ("rejection" in outcome) throw outcome.rejection;
  return outcome.data;
}

async function recordAttendance(tx: Prisma.TransactionClient, credential: Credential, activitySessionId: string, actorId: string, persistent: boolean): Promise<AttendanceQrResult> {
    if (credential.estado !== "ACTIVO") throw new AttendanceQrError("REVOKED_QR", "La credencial QR fue revocada.");
    if (credential.usuario.deletedAt || credential.usuario.estadoParticipacion !== "HABILITADO") throw new AttendanceQrError("USER_DISABLED", "El usuario no está habilitado para participar.", 409);

    const session = await tx.claseActividad.findUnique({ where: { id: activitySessionId }, include: { horarioActividad: { select: { actividad: { select: { modalidadInscripcion: true } } } } } });
    if (!session) throw new AttendanceQrError("SESSION_NOT_AVAILABLE", "Clase no encontrada.", 404);
    if (!["PROGRAMADA", "EN_CURSO"].includes(session.estado)) throw new AttendanceQrError("SESSION_NOT_AVAILABLE", "La clase no permite escaneo QR.", 409);
    if (session.asistenciaCerradaAt) throw new AttendanceQrError("ATTENDANCE_CLOSED", "Planilla cerrada.", 409);
    const now = new Date(), start = localDateTime(session.fecha, session.horaInicio), end = localDateTime(session.fecha, session.horaFin);
    if (now.getTime() < start.getTime() - early * 60000 || now.getTime() > end.getTime() + late * 60000) throw new AttendanceQrError("OUTSIDE_TIME_WINDOW", "El escaneo está fuera de la ventana habilitada.", 409);

    const enrollment = await tx.inscripcion.findFirst({ where: { usuarioId: credential.usuarioId, OR: [{ horarioActividadId: session.horarioActividadId }, { horarios: { some: { horarioActividadId: session.horarioActividadId } } }] }, include: { reservas: { where: { claseActividadId: session.id }, select: { estado: true } } } });
    if (!enrollment) throw new AttendanceQrError("NOT_ENROLLED", "Usuario no inscripto.", 409);
    const reservation = enrollment.reservas[0];
    const validPeriod = (!enrollment.fechaInicio || enrollment.fechaInicio <= session.fecha) && (!enrollment.fechaFin || enrollment.fechaFin >= session.fecha);
    const recurringAccess = enrollment.estado === "CONFIRMADA" && enrollment.modalidad !== "POR_CLASE" && validPeriod && reservation?.estado !== "AUSENCIA_INFORMADA";
    const reservedAccess = reservation?.estado === "RESERVADA";
    if (!recurringAccess && !reservedAccess) throw new AttendanceQrError("ENROLLMENT_NOT_CONFIRMED", "La persona no tiene un lugar confirmado para esta clase.", 409);

    if (persistent) await tx.usuarioQrCredencial.update({ where: { id: credential.id }, data: { ultimoUsoAt: now } });
    const existing = await tx.asistencia.findUnique({ where: { claseActividadId_inscripcionId: { claseActividadId: session.id, inscripcionId: enrollment.id } } });
    const user = { id: credential.usuario.id, firstName: credential.usuario.nombre, lastName: credential.usuario.apellido, documentNumber: credential.usuario.documento, avatarUrl: credential.usuario.avatarUrl };
    const enrollmentDto = { id: enrollment.id, status: enrollment.estado };
    if (existing) {
      if (existing.estado === "PRESENTE") return { result: "ALREADY_REGISTERED", message: existing.origen === "QR" ? "Asistencia ya registrada." : "La asistencia ya fue registrada manualmente.", attendance: { id: existing.id, status: existing.estado, origin: existing.origen, registeredAt: existing.horaRegistro?.toISOString() ?? null }, user, enrollment: enrollmentDto };
      throw new AttendanceQrError("EXISTING_DIFFERENT_STATUS", `La persona ya tiene una asistencia registrada como ${existing.estado.toLowerCase()}.`, 409);
    }
    try {
      const attendance = await tx.asistencia.create({ data: { claseActividadId: session.id, inscripcionId: enrollment.id, estado: "PRESENTE", origen: "QR", horaRegistro: now, registradoPorId: actorId } });
      return { result: "REGISTERED", message: "Asistencia registrada correctamente.", attendance: { id: attendance.id, status: attendance.estado, origin: attendance.origen, registeredAt: attendance.horaRegistro?.toISOString() ?? null }, user, enrollment: enrollmentDto };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const found = await tx.asistencia.findUniqueOrThrow({ where: { claseActividadId_inscripcionId: { claseActividadId: session.id, inscripcionId: enrollment.id } } });
        return { result: "ALREADY_REGISTERED", message: "Asistencia ya registrada.", attendance: { id: found.id, status: found.estado, origin: found.origen, registeredAt: found.horaRegistro?.toISOString() ?? null }, user, enrollment: enrollmentDto };
      }
      throw error;
    }
}
