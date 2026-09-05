import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogConflictError, CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { createNotifications, notifyAdministrators } from "@/features/notifications/services/notifications.server";
import { releaseReservationResources, reserveAutomaticResources } from "@/features/resources/services/resource-booking.server";

async function lockedClass(tx: Prisma.TransactionClient, classId: string) {
  await tx.$queryRaw`SELECT "id" FROM "ClaseActividad" WHERE "id" = ${classId} FOR UPDATE`;
  const row = await tx.claseActividad.findUnique({ where: { id: classId }, include: { horarioActividad: { include: { actividad: true, recursos: { include: { recurso: true } } } }, establecimiento: true } });
  if (!row) throw new CatalogNotFoundError("Clase no encontrada.");
  if (row.estado !== "PROGRAMADA") throw new CatalogValidationError("La clase no admite reservas.");
  return row;
}

async function availability(tx: Prisma.TransactionClient, session: Awaited<ReturnType<typeof lockedClass>>) {
  let capacity = session.cupoMaximo ?? session.horarioActividad.cupoMaximo;
  for (const assignment of session.horarioActividad.recursos.filter((item) => item.estrategiaAsignacion === "AL_INGRESAR")) {
    const blocked = await tx.bloqueoRecurso.aggregate({ where: { recursoId: assignment.recursoId, fecha: session.fecha, horaInicio: { lt: session.horaFin }, horaFin: { gt: session.horaInicio }, claseActividadId: { not: session.id } }, _sum: { cantidad: true } });
    capacity = Math.min(capacity, Math.max(Math.min(assignment.cantidadReservada, assignment.recurso.capacidadUnidades - (blocked._sum.cantidad ?? 0)), 0));
  }
  const confirmed = session.horarioActividad.actividad.modalidadInscripcion === "POR_CLASE"
    ? await tx.reservaClase.count({ where: { claseActividadId: session.id, estado: "RESERVADA" } })
    : await tx.inscripcion.count({ where: { estado: "CONFIRMADA", AND: [{ OR: [{ horarioActividadId: session.horarioActividadId }, { horarios: { some: { horarioActividadId: session.horarioActividadId } } }] }, { OR: [{ fechaInicio: null }, { fechaInicio: { lte: session.fecha } }] }, { OR: [{ fechaFin: null }, { fechaFin: { gte: session.fecha } }] }], reservas: { none: { claseActividadId: session.id, estado: "AUSENCIA_INFORMADA" } } } })
      + await tx.reservaClase.count({ where: { claseActividadId: session.id, estado: "RESERVADA", inscripcion: { estado: "LISTA_ESPERA" } } });
  return { capacity, confirmed, available: Math.max(capacity - confirmed, 0) };
}

async function offerReleasedSeat(tx: Prisma.TransactionClient, classId: string) {
  const session = await tx.claseActividad.findUniqueOrThrow({ where: { id: classId }, select: { horarioActividadId: true, fecha: true, horaInicio: true } });
  const scheduleWaiting = await tx.inscripcion.findMany({ where: { estado: "LISTA_ESPERA", OR: [{ horarioActividadId: session.horarioActividadId }, { horarios: { some: { horarioActividadId: session.horarioActividadId } } }] }, select: { id: true, usuarioId: true, fechaListaEspera: true }, orderBy: [{ fechaListaEspera: "asc" }, { createdAt: "asc" }] });
  for (const enrollment of scheduleWaiting) await tx.reservaClase.upsert({ where: { claseActividadId_usuarioId: { claseActividadId: classId, usuarioId: enrollment.usuarioId } }, create: { claseActividadId: classId, usuarioId: enrollment.usuarioId, inscripcionId: enrollment.id, estado: "LISTA_ESPERA", posicionEsperaAt: enrollment.fechaListaEspera ?? new Date() }, update: {} });
  const waiting = await tx.reservaClase.findMany({ where: { claseActividadId: classId, estado: "LISTA_ESPERA" }, select: { id: true, usuarioId: true }, orderBy: [{ posicionEsperaAt: "asc" }, { createdAt: "asc" }] });
  if (!waiting.length) return;
  const offeredAt = new Date();
  const expiresAt = new Date(`${session.fecha.toISOString().slice(0, 10)}T${session.horaInicio}:00-03:00`);
  await tx.reservaClase.updateMany({ where: { id: { in: waiting.map((item) => item.id) } }, data: { estado: "OFRECIDA", ofrecidoAt: offeredAt, ofertaVenceAt: expiresAt } });
  await createNotifications(waiting.map((item) => ({ userId: item.usuarioId, type: "GENERAL" as const, title: "Cupo disponible", message: "Se liberó un lugar. La primera persona de la lista que confirme obtendrá el cupo.", priority: "ALTA" as const, actionUrl: `/citizen/schedule?classId=${classId}`, actionLabel: "Confirmar asistencia", entityType: "class_reservation", entityId: item.id, deduplicationKey: `class-seat-offer:${item.id}:${offeredAt.getTime()}` })), tx);
}

export async function reserveCitizenClass(userId: string, classId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await lockedClass(tx, classId);
    if (session.horarioActividad.actividad.modalidadInscripcion !== "POR_CLASE") throw new CatalogValidationError("Esta actividad no utiliza reservas por clase.");
    const user = await tx.usuario.findUnique({ where: { id: userId }, select: { estadoParticipacion: true } });
    if (!user || user.estadoParticipacion !== "HABILITADO") throw new CatalogValidationError("No estás habilitado para realizar reservas.");
    const enrollment = await tx.inscripcion.findFirst({ where: { usuarioId: userId, estado: "CONFIRMADA", OR: [{ horarioActividadId: session.horarioActividadId }, { horarios: { some: { horarioActividadId: session.horarioActividadId } } }] }, select: { id: true } });
    if (!enrollment) throw new CatalogValidationError("Primero debés completar la inscripción y la documentación requerida.");
    const existing = await tx.reservaClase.findUnique({ where: { claseActividadId_usuarioId: { claseActividadId: classId, usuarioId: userId } } });
    if (existing && !["CANCELADA", "AUSENCIA_INFORMADA"].includes(existing.estado)) throw new CatalogConflictError("Ya tenés una reserva o lugar en espera para esta clase.");
    const cap = await availability(tx, session);
    const status = cap.available > 0 ? "RESERVADA" as const : "LISTA_ESPERA" as const;
    const now = new Date();
    const saved = existing ? await tx.reservaClase.update({ where: { id: existing.id }, data: { estado: status, inscripcionId: enrollment.id, confirmadoAt: status === "RESERVADA" ? now : null, posicionEsperaAt: status === "LISTA_ESPERA" ? now : null, canceladoAt: null, motivoCancelacion: null, cancelacionJustificada: null } }) : await tx.reservaClase.create({ data: { claseActividadId: classId, usuarioId: userId, inscripcionId: enrollment.id, estado: status, confirmadoAt: status === "RESERVADA" ? now : null, posicionEsperaAt: status === "LISTA_ESPERA" ? now : null } });
    if (status === "RESERVADA") await reserveAutomaticResources(tx, session, saved.id, userId);
    return saved;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function confirmOfferedSeat(userId: string, classId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await lockedClass(tx, classId);
    const reservation = await tx.reservaClase.findUnique({ where: { claseActividadId_usuarioId: { claseActividadId: classId, usuarioId: userId } } });
    if (!reservation || reservation.estado !== "OFRECIDA") throw new CatalogValidationError("No tenés una oferta vigente para esta clase.");
    if (reservation.ofertaVenceAt && reservation.ofertaVenceAt < new Date()) throw new CatalogValidationError("La oferta de cupo venció.");
    if ((await availability(tx, session)).available <= 0) throw new CatalogConflictError("El cupo ya fue confirmado por otra persona.");
    const saved = await tx.reservaClase.update({ where: { id: reservation.id }, data: { estado: "RESERVADA", confirmadoAt: new Date() } });
    await reserveAutomaticResources(tx, session, saved.id, userId);
    const others = await tx.reservaClase.findMany({ where: { claseActividadId: classId, estado: "OFRECIDA", id: { not: saved.id } }, select: { id: true, usuarioId: true } });
    if (others.length) {
      await tx.reservaClase.updateMany({ where: { id: { in: others.map((item) => item.id) } }, data: { estado: "LISTA_ESPERA", ofrecidoAt: null, ofertaVenceAt: null } });
      await createNotifications(others.map((item) => ({ userId: item.usuarioId, type: "GENERAL" as const, title: "Cupo ocupado", message: "Otra persona confirmó antes el cupo disponible. Continuás en la lista de espera.", priority: "NORMAL" as const, actionUrl: "/citizen/schedule", actionLabel: "Ver próximas clases", entityType: "class_reservation", entityId: item.id, deduplicationKey: `class-seat-taken:${item.id}:${saved.updatedAt.getTime()}` })), tx);
    }
    return saved;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function cancelCitizenClass(userId: string, classId: string, reason: string, proofUrl?: string | null) {
  return prisma.$transaction(async (tx) => {
    const session = await lockedClass(tx, classId);
    const enrollment = await tx.inscripcion.findFirst({ where: { usuarioId: userId, estado: "CONFIRMADA", AND: [{ OR: [{ horarioActividadId: session.horarioActividadId }, { horarios: { some: { horarioActividadId: session.horarioActividadId } } }] }, { OR: [{ fechaFin: null }, { fechaFin: { gte: session.fecha } }] }] }, select: { id: true } });
    if (!enrollment) throw new CatalogValidationError("No estás inscripto en esta clase.");
    const startsAt = new Date(`${session.fecha.toISOString().slice(0, 10)}T${session.horaInicio}:00-03:00`);
    const justified = startsAt.getTime() - Date.now() >= session.horarioActividad.actividad.horasCancelacionJustificada * 60 * 60 * 1000;
    const current = await tx.reservaClase.findUnique({ where: { claseActividadId_usuarioId: { claseActividadId: classId, usuarioId: userId } } });
    if (current && !["RESERVADA", "LISTA_ESPERA", "OFRECIDA"].includes(current.estado)) throw new CatalogConflictError("La participación ya fue cancelada.");
    const now = new Date();
    const saved = current ? await tx.reservaClase.update({ where: { id: current.id }, data: { estado: "AUSENCIA_INFORMADA", canceladoAt: now, motivoCancelacion: reason.trim(), cancelacionJustificada: justified, comprobanteUrl: proofUrl || null } }) : await tx.reservaClase.create({ data: { claseActividadId: classId, usuarioId: userId, inscripcionId: enrollment.id, estado: "AUSENCIA_INFORMADA", canceladoAt: now, motivoCancelacion: reason.trim(), cancelacionJustificada: justified, comprobanteUrl: proofUrl || null } });
    await releaseReservationResources(tx, saved.id);
    await tx.asistencia.upsert({ where: { claseActividadId_inscripcionId: { claseActividadId: classId, inscripcionId: enrollment.id } }, create: { claseActividadId: classId, inscripcionId: enrollment.id, estado: justified ? "JUSTIFICADA" : "AUSENTE", origen: "MANUAL", horaRegistro: now, motivoJustificacion: justified ? reason.trim() : null, observaciones: justified ? null : `Cancelación tardía: ${reason.trim()}` }, update: { estado: justified ? "JUSTIFICADA" : "AUSENTE", horaRegistro: now, motivoJustificacion: justified ? reason.trim() : null, observaciones: justified ? null : `Cancelación tardía: ${reason.trim()}` } });
    const citizen = await tx.usuario.findUniqueOrThrow({ where: { id: userId }, select: { nombre: true, apellido: true } });
    await notifyAdministrators({ type: "GENERAL", title: justified ? "Inasistencia justificada" : "Cancelación tardía de clase", message: `${[citizen.nombre, citizen.apellido].filter(Boolean).join(" ")} canceló su participación en ${session.horarioActividad.actividad.nombre}. Motivo: ${reason.trim()}`, priority: justified ? "NORMAL" : "ALTA", actionUrl: `/attendance/${classId}`, actionLabel: "Ver asistencia", entityType: "class_reservation", entityId: saved.id, deduplicationKey: `class-cancelled:${saved.id}:${now.getTime()}` }, tx);
    if (!current || current.estado === "RESERVADA") await offerReleasedSeat(tx, classId);
    return saved;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
