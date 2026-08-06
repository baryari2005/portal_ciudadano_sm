import { AccesoMotivo, AccesoOrigen, AccesoResultado, Prisma } from "@prisma/client";
import { createAuditLogTx } from "@/features/audit-log/services/audit-log.server";
import { hashDigitalAccessQrToken } from "./digital-access-qr.server";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import type { AccessEvaluation, AccessOrigin, AccessPerson, AccessReason, AccessValidationResponse } from "../types/access.types";

const EARLY_MINUTES = Number(process.env.ACCESS_EARLY_MINUTES ?? 30);
const LATE_MINUTES = Number(process.env.ACCESS_LATE_MINUTES ?? 30);
const TIME_ZONE = "America/Argentina/Buenos_Aires";
type Tx = Prisma.TransactionClient;
type RequestContext = { ip?: string | null; userAgent?: string | null };

const reasonMessages: Record<AccessReason, string> = {
  USUARIO_HABILITADO: "Ingreso autorizado.", QR_INVALIDO: "La credencial QR no es válida.", QR_REVOCADO: "La credencial QR fue revocada.", QR_USADO: "El QR digital ya fue utilizado.",
  USUARIO_INACTIVO: "La persona no se encuentra habilitada.", USUARIO_ELIMINADO: "La persona fue eliminada.", SIN_INSCRIPCION: "La persona no tiene una inscripción para ingresar.",
  INSCRIPCION_NO_CONFIRMADA: "La inscripción no está confirmada.", SIN_CLASE_HABILITADA: "No hay una clase habilitada para el ingreso.", FUERA_DE_HORARIO: "El ingreso está fuera de la ventana habilitada.",
  CLASE_SUSPENDIDA: "La clase se encuentra suspendida.", CLASE_CANCELADA: "La clase se encuentra cancelada.", ESTABLECIMIENTO_INCORRECTO: "La clase corresponde a otro establecimiento.",
  ACCESO_MANUAL_AUTORIZADO: "Ingreso autorizado manualmente.", ACCESO_MANUAL_RECHAZADO: "Ingreso rechazado manualmente.",
};

function localParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function localDateTime(date: string, time: string) { return new Date(`${date}T${time}:00-03:00`); }
function person(user: { id: string; nombre: string | null; apellido: string | null; documento: string | null; email?: string; estado?: string; avatarUrl: string | null; fotoPerfilUrl: string | null }): AccessPerson {
  return { id: user.id, nombre: user.nombre, apellido: user.apellido, dni: user.documento ?? "", email: user.email, estado: user.estado, avatarUrl: user.avatarUrl, profilePhotoUrl: user.fotoPerfilUrl };
}
async function activeEstablishment(id: string, db: Tx | typeof prisma = prisma) {
  const establishment = await db.establecimiento.findFirst({ where: { id, activo: true, estado: { not: "inactivo" } }, select: { id: true, nombre: true } });
  if (!establishment) throw new CatalogValidationError("El establecimiento seleccionado no está habilitado.");
  return establishment;
}

export async function evaluateAccess(user: { id: string; estado: string; deletedAt: Date | null }, establishmentId: string, now = new Date(), origin: AccessOrigin = "QR", db: Tx | typeof prisma = prisma): Promise<AccessEvaluation> {
  void origin;
  await activeEstablishment(establishmentId, db);
  if (user.deletedAt) return evaluation("USUARIO_ELIMINADO");
  if (user.estado !== "ACTIVO") return evaluation("USUARIO_INACTIVO");
  const participation = await db.usuario.findUnique({ where: { id: user.id }, select: { estadoParticipacion: true } });
  if (!participation || participation.estadoParticipacion !== "HABILITADO") return evaluation("USUARIO_INACTIVO");
  const date = localParts(now);
  const dayStart = localDateTime(date, "00:00");
  const dayEnd = localDateTime(date, "23:59");
  const sessions = await db.claseActividad.findMany({
    where: { fecha: { gte: dayStart, lte: dayEnd }, horarioActividad: { inscripciones: { some: { usuarioId: user.id } } } },
    include: { reservas: { where: { usuarioId: user.id }, select: { estado: true }, take: 1 }, horarioActividad: { include: { actividad: { select: { nombre: true, modalidadInscripcion: true } }, inscripciones: { where: { usuarioId: user.id }, take: 1 } } } },
    orderBy: { horaInicio: "asc" },
  });
  if (!sessions.length) return evaluation("SIN_INSCRIPCION");
  const atEstablishment = sessions.filter((session) => session.establecimientoId === establishmentId);
  if (!atEstablishment.length) return evaluation("ESTABLECIMIENTO_INCORRECTO");
  const confirmed = atEstablishment.filter((session) => {
    const enrollment = session.horarioActividad.inscripciones[0];
    const reservation = session.reservas[0];
    const validPeriod = enrollment && (!enrollment.fechaInicio || enrollment.fechaInicio <= session.fecha) && (!enrollment.fechaFin || enrollment.fechaFin >= session.fecha);
    return reservation?.estado === "RESERVADA" || (enrollment?.estado === "CONFIRMADA" && enrollment.modalidad !== "POR_CLASE" && validPeriod && reservation?.estado !== "AUSENCIA_INFORMADA");
  });
  if (!confirmed.length) return evaluation("INSCRIPCION_NO_CONFIRMADA");
  const enabled = confirmed.filter((session) => ["PROGRAMADA", "EN_CURSO"].includes(session.estado));
  if (!enabled.length) {
    if (confirmed.some((session) => session.estado === "SUSPENDIDA")) return evaluation("CLASE_SUSPENDIDA");
    if (confirmed.some((session) => session.estado === "CANCELADA")) return evaluation("CLASE_CANCELADA");
    return evaluation("SIN_CLASE_HABILITADA");
  }
  const matched = enabled.find((session) => {
    const start = localDateTime(date, session.horaInicio).getTime() - EARLY_MINUTES * 60000;
    const end = localDateTime(date, session.horaFin).getTime() + LATE_MINUTES * 60000;
    return now.getTime() >= start && now.getTime() <= end;
  });
  if (!matched) return evaluation("FUERA_DE_HORARIO");
  const enrollment = matched.horarioActividad.inscripciones[0];
  return { ...evaluation("USUARIO_HABILITADO"), allowed: true, result: "PERMITIDO", matchedSession: { id: matched.id, activityName: matched.horarioActividad.actividad.nombre, startTime: matched.horaInicio, endTime: matched.horaFin }, matchedEnrollmentId: enrollment.id };
}
function evaluation(reason: AccessReason): AccessEvaluation { return { allowed: false, result: "RECHAZADO", reason, message: reasonMessages[reason] }; }

async function markTodayAttendancesFromAccess(tx: Tx, input: { userId: string; establishmentId: string; actorId: string; occurredAt: Date }) {
  const date = localParts(input.occurredAt);
  const sessions = await tx.claseActividad.findMany({
    where: {
      establecimientoId: input.establishmentId,
      fecha: { gte: localDateTime(date, "00:00"), lte: localDateTime(date, "23:59") },
      estado: { in: ["PROGRAMADA", "EN_CURSO"] },
      asistenciaCerradaAt: null,
      horarioActividad: { inscripciones: { some: { usuarioId: input.userId } } },
    },
    include: {
      reservas: { where: { usuarioId: input.userId }, select: { estado: true }, take: 1 },
      horarioActividad: { include: { inscripciones: { where: { usuarioId: input.userId }, take: 1 } } },
    },
  });
  const attendances = sessions.flatMap((session) => {
    const enrollment = session.horarioActividad.inscripciones[0];
    const reservation = session.reservas[0];
    if (!enrollment) return [];
    const validPeriod = (!enrollment.fechaInicio || enrollment.fechaInicio <= session.fecha) && (!enrollment.fechaFin || enrollment.fechaFin >= session.fecha);
    const eligible = reservation?.estado === "RESERVADA" || (enrollment.estado === "CONFIRMADA" && enrollment.modalidad !== "POR_CLASE" && validPeriod && reservation?.estado !== "AUSENCIA_INFORMADA");
    return eligible ? [{ claseActividadId: session.id, inscripcionId: enrollment.id, estado: "PRESENTE" as const, origen: "ACCESO" as const, horaRegistro: input.occurredAt, registradoPorId: input.actorId }] : [];
  });
  if (attendances.length) await tx.asistencia.createMany({ data: attendances, skipDuplicates: true });
  return attendances.length;
}

async function saveAccess(tx: Tx, input: { user?: AccessPerson; establishmentId: string; evaluation: AccessEvaluation; origin: AccesoOrigen; actorId: string; observation?: string; requestContext?: RequestContext }) {
  const record = await tx.registroAcceso.create({ data: { usuarioId: input.user?.id, establecimientoId: input.establishmentId, claseActividadId: input.evaluation.matchedSession?.id, inscripcionId: input.evaluation.matchedEnrollmentId, resultado: input.evaluation.result as AccesoResultado, motivo: input.evaluation.reason as AccesoMotivo, origen: input.origin, registradoPorId: input.actorId, nombreSnapshot: input.user ? [input.user.nombre, input.user.apellido].filter(Boolean).join(" ") : null, documentoSnapshot: input.user?.dni || null, observaciones: input.observation } });
  const automaticAttendances = input.evaluation.result === "PERMITIDO" && input.user ? await markTodayAttendancesFromAccess(tx, { userId: input.user.id, establishmentId: input.establishmentId, actorId: input.actorId, occurredAt: record.fechaHora }) : 0;
  await createAuditLogTx(tx, { actorId: input.actorId, action: input.evaluation.result === "PERMITIDO" ? "CREAR" : "RECHAZAR", entityType: "REGISTRO_ACCESO", entityId: record.id, entityName: input.user ? `Ingreso · ${record.nombreSnapshot}` : "Intento de ingreso no identificado", metadata: { resultado: record.resultado, motivo: record.motivo, origen: record.origen, establecimientoId: record.establecimientoId, asistenciasAutomaticas: automaticAttendances }, origin: ["QR", "QR_DIGITAL", "CARNET_FISICO"].includes(input.origin) ? "QR" : "ADMINISTRACION", requestContext: input.requestContext });
  return record;
}

type PhysicalCardPayload = { type: "MASM_ACCESS_CARD"; userId: string; username: string; dni: string };

function parsePhysicalCardPayload(value: string): PhysicalCardPayload | null {
  try {
    const parsed = JSON.parse(value) as Partial<PhysicalCardPayload>;
    if (parsed.type !== "MASM_ACCESS_CARD" || typeof parsed.userId !== "string" || typeof parsed.username !== "string" || typeof parsed.dni !== "string") return null;
    return parsed as PhysicalCardPayload;
  } catch {
    return null;
  }
}

async function validatePhysicalCardAccess(tx: Tx, establishmentId: string, payload: PhysicalCardPayload, actorId: string, requestContext?: RequestContext): Promise<AccessValidationResponse> {
  const user = await tx.usuario.findUnique({ where: { id: payload.userId }, select: { id: true, userId: true, nombre: true, apellido: true, documento: true, email: true, estado: true, avatarUrl: true, fotoPerfilUrl: true, deletedAt: true } });
  if (!user || user.userId !== payload.username || user.documento !== payload.dni) {
    const result = evaluation("QR_INVALIDO");
    const record = await saveAccess(tx, { establishmentId, evaluation: result, origin: "CARNET_FISICO", actorId, requestContext });
    return { ...result, accessRecordId: record.id, occurredAt: record.fechaHora.toISOString() };
  }
  const accessPerson = person(user);
  const result = await evaluateAccess(user, establishmentId, new Date(), "CARNET_FISICO", tx);
  const record = await saveAccess(tx, { user: accessPerson, establishmentId, evaluation: result, origin: "CARNET_FISICO", actorId, requestContext });
  return { ...result, accessRecordId: record.id, occurredAt: record.fechaHora.toISOString(), user: accessPerson };
}

export async function validateQrAccess(establishmentId: string, qrToken: string, actorId: string, requestContext?: RequestContext): Promise<AccessValidationResponse> {
  return prisma.$transaction(async (tx) => {
    await activeEstablishment(establishmentId, tx);
    const physicalCard = parsePhysicalCardPayload(qrToken);
    if (physicalCard) return validatePhysicalCardAccess(tx, establishmentId, physicalCard, actorId, requestContext);
    const persistentCredential = await tx.usuarioQrCredencial.findUnique({ where: { tokenHash: hashDigitalAccessQrToken(qrToken) }, include: { usuario: { select: { id: true, nombre: true, apellido: true, documento: true, email: true, estado: true, avatarUrl: true, fotoPerfilUrl: true, deletedAt: true } } } });
    if (persistentCredential) {
      const accessPerson = person(persistentCredential.usuario);
      const result = persistentCredential.estado === "ACTIVO" ? await evaluateAccess(persistentCredential.usuario, establishmentId, new Date(), "QR", tx) : evaluation("QR_REVOCADO");
      if (persistentCredential.estado === "ACTIVO") await tx.usuarioQrCredencial.update({ where: { id: persistentCredential.id }, data: { ultimoUsoAt: new Date() } });
      const record = await saveAccess(tx, { user: accessPerson, establishmentId, evaluation: result, origin: "QR", actorId, requestContext });
      return { ...result, accessRecordId: record.id, occurredAt: record.fechaHora.toISOString(), user: accessPerson };
    }
    const credential = await tx.accesoQrDigital.findUnique({ where: { tokenHash: hashDigitalAccessQrToken(qrToken) }, include: { usuario: { select: { id: true, nombre: true, apellido: true, documento: true, email: true, estado: true, avatarUrl: true, fotoPerfilUrl: true, deletedAt: true } } } });
    if (!credential) { const result = evaluation("QR_INVALIDO"); const record = await saveAccess(tx, { establishmentId, evaluation: result, origin: qrToken.startsWith("masm_access_") ? "QR_DIGITAL" : "QR", actorId, requestContext }); return { ...result, accessRecordId: record.id, occurredAt: record.fechaHora.toISOString() }; }
    const accessPerson = person(credential.usuario);
    const result = credential.estado === "ACTIVO" ? await evaluateAccess(credential.usuario, establishmentId, new Date(), "QR_DIGITAL", tx) : evaluation(credential.estado === "CONSUMIDO" ? "QR_USADO" : "QR_REVOCADO");
    if (credential.estado === "ACTIVO") {
      const consumed = await tx.accesoQrDigital.updateMany({ where: { id: credential.id, estado: "ACTIVO" }, data: { estado: "CONSUMIDO", consumidoAt: new Date() } });
      if (consumed.count !== 1) throw new CatalogValidationError("El QR digital ya fue utilizado.");
    }
    const record = await saveAccess(tx, { user: accessPerson, establishmentId, evaluation: result, origin: "QR_DIGITAL", actorId, requestContext });
    return { ...result, accessRecordId: record.id, occurredAt: record.fechaHora.toISOString(), user: accessPerson };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function searchAccessUsers(query: string, establishmentId: string, page = 1, pageSize = 8) {
  await activeEstablishment(establishmentId);
  const q = query.trim();
  const where: Prisma.UsuarioWhereInput = { OR: [{ documento: { contains: q } }, { nombre: { contains: q, mode: "insensitive" } }, { apellido: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { id: q.length >= 30 ? q : undefined }] };
  const [total, users] = await prisma.$transaction([prisma.usuario.count({ where }), prisma.usuario.findMany({ where, orderBy: [{ apellido: "asc" }, { nombre: "asc" }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, nombre: true, apellido: true, documento: true, email: true, estado: true, avatarUrl: true, fotoPerfilUrl: true, deletedAt: true } })]);
  const items = await Promise.all(users.map(async (user) => ({ ...person(user), validation: await evaluateAccess(user, establishmentId, new Date(), "MANUAL") })));
  return { items, meta: { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function registerManualAccess(input: { establishmentId: string; userId: string; decision: "ALLOW" | "REJECT"; observation: string }, actorId: string, requestContext?: RequestContext) {
  return prisma.$transaction(async (tx) => {
    await activeEstablishment(input.establishmentId, tx);
    const user = await tx.usuario.findUnique({ where: { id: input.userId }, select: { id: true, nombre: true, apellido: true, documento: true, email: true, estado: true, avatarUrl: true, fotoPerfilUrl: true, deletedAt: true } });
    if (!user) throw new CatalogNotFoundError("Usuario no encontrado.");
    const base = await evaluateAccess(user, input.establishmentId, new Date(), "MANUAL", tx);
    const result: AccessEvaluation = input.decision === "ALLOW" ? { ...base, allowed: true, result: "PERMITIDO", reason: "ACCESO_MANUAL_AUTORIZADO", message: reasonMessages.ACCESO_MANUAL_AUTORIZADO } : { ...base, allowed: false, result: "RECHAZADO", reason: "ACCESO_MANUAL_RECHAZADO", message: reasonMessages.ACCESO_MANUAL_RECHAZADO };
    const record = await saveAccess(tx, { user: person(user), establishmentId: input.establishmentId, evaluation: result, origin: "MANUAL", actorId, observation: input.observation, requestContext });
    return { ...result, accessRecordId: record.id, occurredAt: record.fechaHora.toISOString(), user: person(user) };
  });
}

const accessInclude = { usuario: { select: { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true } }, establecimiento: { select: { id: true, nombre: true } }, registradoPor: { select: { id: true, nombre: true, apellido: true } }, anuladoPor: { select: { id: true, nombre: true, apellido: true } }, claseActividad: { include: { horarioActividad: { include: { actividad: { select: { nombre: true } } } } } }, inscripcion: { select: { id: true, estado: true } } } satisfies Prisma.RegistroAccesoInclude;
export async function listAccessRecords(filters: { search?: string; result?: AccesoResultado; reason?: AccesoMotivo; origin?: AccesoOrigen; establishmentId?: string; userId?: string; registeredById?: string; dateFrom?: Date; dateTo?: Date; page: number; pageSize: number }) {
  const where: Prisma.RegistroAccesoWhereInput = { resultado: filters.result, motivo: filters.reason, origen: filters.origin, establecimientoId: filters.establishmentId, usuarioId: filters.userId, registradoPorId: filters.registeredById, fechaHora: filters.dateFrom || filters.dateTo ? { gte: filters.dateFrom, lte: filters.dateTo } : undefined, ...(filters.search ? { OR: [{ nombreSnapshot: { contains: filters.search, mode: "insensitive" } }, { documentoSnapshot: { contains: filters.search } }] } : {}) };
  const [total, items] = await prisma.$transaction([prisma.registroAcceso.count({ where }), prisma.registroAcceso.findMany({ where, include: accessInclude, orderBy: { fechaHora: "desc" }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize })]);
  return { items, meta: { total, page: filters.page, pageSize: filters.pageSize, pageCount: Math.max(1, Math.ceil(total / filters.pageSize)) } };
}
export async function getAccessRecord(id: string) { const record = await prisma.registroAcceso.findUnique({ where: { id }, include: accessInclude }); if (!record) throw new CatalogNotFoundError("Registro de acceso no encontrado."); return record; }
export async function updateAccessRecord(id: string, observations: string, actorId: string, requestContext?: RequestContext) { return prisma.$transaction(async (tx) => { const before = await tx.registroAcceso.findUnique({ where: { id } }); if (!before) throw new CatalogNotFoundError("Registro de acceso no encontrado."); if (before.anuladoAt) throw new CatalogValidationError("No se puede corregir un registro anulado."); const record = await tx.registroAcceso.update({ where: { id }, data: { observaciones: observations } }); await createAuditLogTx(tx, { actorId, action: "EDITAR", entityType: "REGISTRO_ACCESO", entityId: id, changes: { observaciones: { before: before.observaciones, after: observations } }, origin: "ADMINISTRACION", requestContext }); return record; }); }
export async function annulAccessRecord(id: string, reason: string, actorId: string, requestContext?: RequestContext) { return prisma.$transaction(async (tx) => { const before = await tx.registroAcceso.findUnique({ where: { id } }); if (!before) throw new CatalogNotFoundError("Registro de acceso no encontrado."); if (before.anuladoAt) throw new CatalogValidationError("El registro ya está anulado."); const record = await tx.registroAcceso.update({ where: { id }, data: { anuladoAt: new Date(), anuladoPorId: actorId, motivoAnulacion: reason } }); await createAuditLogTx(tx, { actorId, action: "ANULAR", entityType: "REGISTRO_ACCESO", entityId: id, changes: { anuladoAt: { before: null, after: record.anuladoAt }, motivoAnulacion: { before: null, after: reason } }, origin: "ADMINISTRACION", requestContext }); return record; }); }
export async function getAccessHome(establishmentId: string) {
  const establishment = await activeEstablishment(establishmentId);
  const now = new Date();
  const today = localParts(now);
  const start = localDateTime(today, "00:00");
  const end = localDateTime(today, "23:59");
  const baseAccessWhere: Prisma.RegistroAccesoWhereInput = { establecimientoId: establishmentId, fechaHora: { gte: start, lte: end }, anuladoAt: null };
  const [allowedEntries, rejectedEntries, attendedPeople, recent, upcoming] = await Promise.all([
    prisma.registroAcceso.count({ where: { ...baseAccessWhere, resultado: "PERMITIDO" } }),
    prisma.registroAcceso.count({ where: { ...baseAccessWhere, resultado: "RECHAZADO" } }),
    prisma.registroAcceso.findMany({ where: { ...baseAccessWhere, usuarioId: { not: null } }, distinct: ["usuarioId"], select: { usuarioId: true } }),
    prisma.registroAcceso.findMany({ where: { establecimientoId: establishmentId }, include: accessInclude, orderBy: { fechaHora: "desc" }, take: 5 }),
    prisma.claseActividad.findMany({ where: { establecimientoId: establishmentId, fecha: { gte: start }, estado: { in: ["PROGRAMADA", "EN_CURSO"] } }, include: { horarioActividad: { include: { actividad: { select: { nombre: true } } } } }, orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }], take: 6 }),
  ]);
  return {
    allowed: allowedEntries,
    rejected: rejectedEntries,
    recent,
    upcoming,
    establishment: { id: establishment.id, name: establishment.nombre },
    metrics: { totalEntries: allowedEntries + rejectedEntries, allowedEntries, rejectedEntries, attendedPeople: attendedPeople.length },
    recentAccesses: recent.map((item) => ({
      id: item.id,
      occurredAt: item.fechaHora.toISOString(),
      personName: item.nombreSnapshot,
      documentNumber: item.documentoSnapshot,
      result: item.resultado,
      origin: item.origen,
      operatorName: item.registradoPor ? [item.registradoPor.nombre, item.registradoPor.apellido].filter(Boolean).join(" ") : null,
    })),
    upcomingSessions: upcoming.map((item) => ({ id: item.id, date: localParts(item.fecha), startTime: item.horaInicio, activityName: item.horarioActividad.actividad.nombre })),
    updatedAt: now.toISOString(),
  };
}
export async function listActiveEstablishments() { return prisma.establecimiento.findMany({ where: { activo: true, estado: { not: "inactivo" } }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }); }
export async function findAccessUserByDni(dni: string) { const user = await prisma.usuario.findFirst({ where: { documento: dni.replace(/\D/g, ""), deletedAt: null }, select: { id: true, nombre: true, apellido: true, documento: true, avatarUrl: true, fotoPerfilUrl: true } }); return user ? person(user) : null; }
