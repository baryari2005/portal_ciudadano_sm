import type { Prisma } from "@prisma/client";
import { CatalogConflictError } from "@/lib/errors/catalog-errors";

type Tx = Prisma.TransactionClient;
type SessionWithResources = { id: string; fecha: Date; horaInicio: string; horaFin: string; horarioActividad: { recursos: Array<{ recursoId: string; cantidadReservada: number; estrategiaAsignacion: "AUTOMATICA" | "ELEGIDA_USUARIO" | "AL_INGRESAR"; exclusivo: boolean; recurso: { nombre: string; capacidadUnidades: number; modoReserva: "CAPACIDAD" | "ESPECIFICO" | "EXCLUSIVO" } }> } };

export async function reserveAutomaticResources(tx: Tx, session: SessionWithResources, reservationId: string, userId: string) {
  for (const assignment of session.horarioActividad.recursos) {
    if (assignment.estrategiaAsignacion === "AL_INGRESAR") continue;
    const [booked, blocked] = await Promise.all([
      tx.reservaRecurso.aggregate({ where: { recursoId: assignment.recursoId, fecha: session.fecha, estado: { in: ["RESERVADA", "ASIGNADA"] }, horaInicio: { lt: session.horaFin }, horaFin: { gt: session.horaInicio } }, _sum: { cantidad: true } }),
      tx.bloqueoRecurso.aggregate({ where: { recursoId: assignment.recursoId, fecha: session.fecha, horaInicio: { lt: session.horaFin }, horaFin: { gt: session.horaInicio } }, _sum: { cantidad: true } }),
    ]);
    const requested = assignment.exclusivo || assignment.recurso.modoReserva === "EXCLUSIVO" ? assignment.recurso.capacidadUnidades : 1;
    const used = (booked._sum.cantidad ?? 0) + (blocked._sum.cantidad ?? 0);
    if (used + requested > assignment.recurso.capacidadUnidades) throw new CatalogConflictError(`${assignment.recurso.nombre} ya no está disponible en ese horario.`);
    await tx.reservaRecurso.create({ data: { recursoId: assignment.recursoId, reservaClaseId: reservationId, usuarioId: userId, fecha: session.fecha, horaInicio: session.horaInicio, horaFin: session.horaFin, cantidad: requested, estado: assignment.estrategiaAsignacion === "AUTOMATICA" ? "ASIGNADA" : "RESERVADA" } });
  }
}

export async function releaseReservationResources(tx: Tx, reservationId: string) {
  await tx.reservaRecurso.updateMany({ where: { reservaClaseId: reservationId, estado: { not: "CANCELADA" } }, data: { estado: "CANCELADA" } });
}

export async function assignResourceAtEntry(tx: Tx, reservationId: string, resourceId: string) {
  const reservation = await tx.reservaClase.findUniqueOrThrow({ where: { id: reservationId }, include: { claseActividad: { include: { horarioActividad: { include: { recursos: { include: { recurso: true } } } } } } } });
  const assignment = reservation.claseActividad.horarioActividad.recursos.find((item) => item.recursoId === resourceId && item.estrategiaAsignacion === "AL_INGRESAR");
  if (!assignment) throw new CatalogConflictError("El recurso no corresponde a esta reserva.");
  const existing = await tx.reservaRecurso.findFirst({ where: { reservaClaseId: reservation.id, recursoId: resourceId, estado: { not: "CANCELADA" } } });
  if (existing) return existing;
  const used = await tx.reservaRecurso.aggregate({ where: { recursoId: resourceId, fecha: reservation.claseActividad.fecha, estado: { in: ["RESERVADA", "ASIGNADA"] }, horaInicio: { lt: reservation.claseActividad.horaFin }, horaFin: { gt: reservation.claseActividad.horaInicio } }, _sum: { cantidad: true } });
  if ((used._sum.cantidad ?? 0) >= assignment.recurso.capacidadUnidades) throw new CatalogConflictError(`${assignment.recurso.nombre} no tiene unidades disponibles.`);
  return tx.reservaRecurso.create({ data: { recursoId: resourceId, reservaClaseId: reservation.id, usuarioId: reservation.usuarioId, fecha: reservation.claseActividad.fecha, horaInicio: reservation.claseActividad.horaInicio, horaFin: reservation.claseActividad.horaFin, cantidad: 1, estado: "ASIGNADA", asignadoAlIngresar: true } });
}
