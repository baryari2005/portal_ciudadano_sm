import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashQrToken } from "./qr-credentials.server";
import type { AttendanceQrResult, AttendanceQrResultCode } from "../types/attendance-qr.types";

export class AttendanceQrError extends Error {
  constructor(public code: AttendanceQrResultCode, message: string, public status = 422) { super(message); }
}

const early = Number(process.env.QR_ATTENDANCE_EARLY_MINUTES ?? 30);
const late = Number(process.env.QR_ATTENDANCE_LATE_MINUTES ?? 60);
const localDateTime = (date: Date, time: string) => new Date(`${date.toISOString().slice(0, 10)}T${time}:00-03:00`);

export async function registerAttendanceQr(activitySessionId: string, qrToken: string, actorId: string): Promise<AttendanceQrResult> {
  return prisma.$transaction(async (tx) => {
    const credential = await tx.usuarioQrCredencial.findUnique({ where: { tokenHash: hashQrToken(qrToken) }, include: { usuario: { select: { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true, deletedAt: true, estadoParticipacion: true } } } });
    if (!credential) throw new AttendanceQrError("INVALID_QR", "QR inválido.");
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

    await tx.usuarioQrCredencial.update({ where: { id: credential.id }, data: { ultimoUsoAt: now } });
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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
}
