import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError } from "@/lib/errors/catalog-errors";
import { createNotification, notifyAdministrators } from "@/features/notifications/services/notifications.server";

const DEFAULT_JUSTIFIED_THRESHOLD = Number(process.env.DEFAULT_JUSTIFIED_ABSENCE_THRESHOLD || 10);
const DEFAULT_UNJUSTIFIED_THRESHOLD = Number(process.env.DEFAULT_UNJUSTIFIED_ABSENCE_THRESHOLD || 3);

export async function evaluateParticipationReview(tx: Prisma.TransactionClient, userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  for (const userId of uniqueIds) {
    const user = await tx.usuario.findUnique({ where: { id: userId }, select: { id: true, nombre: true, apellido: true, estadoParticipacion: true, umbralAusenciasJustificadas: true, umbralAusenciasInjustificadas: true } });
    if (!user || user.estadoParticipacion !== "HABILITADO") continue;
    const [justified, unjustified] = await Promise.all([
      tx.asistencia.count({ where: { inscripcion: { usuarioId: userId }, estado: "JUSTIFICADA" } }),
      tx.asistencia.count({ where: { inscripcion: { usuarioId: userId }, estado: "AUSENTE" } }),
    ]);
    const justifiedLimit = user.umbralAusenciasJustificadas ?? DEFAULT_JUSTIFIED_THRESHOLD;
    const unjustifiedLimit = user.umbralAusenciasInjustificadas ?? DEFAULT_UNJUSTIFIED_THRESHOLD;
    if (justified < justifiedLimit && unjustified < unjustifiedLimit) continue;

    const now = new Date();
    await tx.usuario.update({ where: { id: userId }, data: { estadoParticipacion: "EN_REVISION", participacionRevisadaAt: now } });
    await tx.inscripcion.updateMany({ where: { usuarioId: userId, estado: { in: ["CONFIRMADA", "LISTA_ESPERA", "PENDIENTE"] } }, data: { estado: "BAJA", motivoCancelacion: "Baja provisoria por revisión de ausencias", fechaCancelacion: now } });
    await tx.reservaClase.updateMany({ where: { usuarioId: userId, estado: { in: ["RESERVADA", "LISTA_ESPERA", "OFRECIDA"] }, claseActividad: { fecha: { gte: now } } }, data: { estado: "CANCELADA", canceladoAt: now, motivoCancelacion: "Baja provisoria por revisión de ausencias" } });
    await createNotification({ userId, type: "GENERAL", title: "Participación en revisión", message: "Tu participación fue suspendida provisoriamente por ausencias reiteradas. Administración revisará tu situación.", priority: "ALTA", actionUrl: "/citizen/attendance", actionLabel: "Ver asistencias", entityType: "participation_review", entityId: userId, deduplicationKey: `participation-review:${userId}:${now.getTime()}` }, tx);
    const name = [user.nombre, user.apellido].filter(Boolean).join(" ") || "Un usuario";
    await notifyAdministrators({ type: "GENERAL", title: "Usuario en revisión por ausencias", message: `${name} alcanzó el umbral de ausencias y recibió una baja provisoria.`, priority: "ALTA", actionUrl: `/users/${userId}`, actionLabel: "Revisar usuario", entityType: "participation_review", entityId: userId, deduplicationKey: `admin-participation-review:${userId}:${now.getTime()}` }, tx);
  }
}

export async function updateParticipationPolicy(userId: string, input: { justifiedAbsenceThreshold: number | null; unjustifiedAbsenceThreshold: number | null; status: "HABILITADO" | "EN_REVISION" | "SUSPENDIDO_PROVISORIO"; observations?: string | null }) {
  const user = await prisma.usuario.findUnique({ where: { id: userId }, select: { id: true, estadoParticipacion: true } });
  if (!user) throw new CatalogNotFoundError("Usuario no encontrado.");
  const restored = input.status === "HABILITADO" && user.estadoParticipacion !== "HABILITADO";
  return prisma.$transaction(async (tx) => {
    const saved = await tx.usuario.update({ where: { id: userId }, data: { estadoParticipacion: input.status, umbralAusenciasJustificadas: input.justifiedAbsenceThreshold, umbralAusenciasInjustificadas: input.unjustifiedAbsenceThreshold, participacionObservaciones: input.observations?.trim() || null, participacionRevisadaAt: input.status === "HABILITADO" ? null : new Date() }, select: { id: true, estadoParticipacion: true, umbralAusenciasJustificadas: true, umbralAusenciasInjustificadas: true, participacionObservaciones: true } });
    if (restored) await createNotification({ userId, type: "GENERAL", title: "Participación habilitada", message: "Administración habilitó nuevamente tu acceso a inscripciones y reservas.", priority: "NORMAL", actionUrl: "/citizen/activities", actionLabel: "Ver actividades", entityType: "participation_review", entityId: userId, deduplicationKey: `participation-restored:${userId}:${Date.now()}` }, tx);
    return saved;
  });
}
