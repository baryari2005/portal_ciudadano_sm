import { randomUUID } from "crypto";
import {
  ActividadCategoria,
  ActividadEstado,
  ActividadNivel,
  DiaSemana,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  CatalogNotFoundError,
  CatalogValidationError,
} from "@/lib/errors/catalog-errors";

import type {
  ActividadInput,
  UpdateActividadInput,
} from "../schemas/actividad.schema";
import { activityGeneralStateSchema } from "../schemas/actividad.schema";
import type { ActividadFilters } from "../types/actividad.types";

const actividadInclude = {
  establecimiento: {
    select: { id: true, nombre: true, direccion: true },
  },
  categoriaActividad: {
    select: {
      id: true,
      nombre: true,
      slug: true,
      color: true,
      icono: true,
      activo: true,
    },
  },
  publicosObjetivo: {
    include: {
      publicoObjetivo: {
        select: { id: true, nombre: true, slug: true, activo: true },
      },
    },
    orderBy: { publicoObjetivo: { orden: "asc" as const } },
  },
  requisitos: {
    include: { requisito: true },
    orderBy: [{ orden: "asc" as const }, { requisito: { nombre: "asc" as const } }],
  },
  horarios: {
    orderBy: { diaSemana: "asc" as const },
  },
  asignados: {
    include: {
      usuario: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          userId: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.ActividadInclude;

type ActivityRecord = Prisma.ActividadGetPayload<{
  include: typeof actividadInclude;
}>;

type DbClient = Prisma.TransactionClient | PrismaClient;

const LEGACY_CATEGORY_BY_SLUG: Partial<Record<string, ActividadCategoria>> = {
  deportes: ActividadCategoria.DEPORTE,
  cultura: ActividadCategoria.CULTURA,
  educacion: ActividadCategoria.EDUCACION,
  salud: ActividadCategoria.SALUD,
};

const LEGACY_STATE_MAP: Record<string, ActividadEstado> = {
  borrador: ActividadEstado.BORRADOR,
  activa: ActividadEstado.ACTIVA,
  activo: ActividadEstado.ACTIVA,
  sin_cupo: ActividadEstado.SIN_CUPO,
  suspendida: ActividadEstado.SUSPENDIDA,
  bloqueada: ActividadEstado.BLOQUEADA,
  finalizada: ActividadEstado.FINALIZADA,
  cancelada: ActividadEstado.CANCELADA,
  inactiva: ActividadEstado.INACTIVA,
  completa: ActividadEstado.COMPLETA,
};

function resolveActivityState(
  estado: ActividadEstado | undefined,
  estadoTexto?: string | null,
) {
  if (estado) return estado === ActividadEstado.SIN_CUPO ? ActividadEstado.ACTIVA : estado;
  const resolved = LEGACY_STATE_MAP[estadoTexto?.trim().toLowerCase() ?? ""] ?? ActividadEstado.BORRADOR;
  return resolved === ActividadEstado.SIN_CUPO ? ActividadEstado.ACTIVA : resolved;
}

function toLegacyStateText(estado: ActividadEstado) {
  return estado.toLowerCase();
}

function mapActividad(record: ActivityRecord) {
  const { publicosObjetivo, requisitos, ...activity } = record;
  return {
    ...activity,
    estado: record.estado === ActividadEstado.SIN_CUPO || record.estado === ActividadEstado.COMPLETA ? ActividadEstado.ACTIVA : record.estado,
    precio: record.precio?.toFixed(2) ?? null,
    publicosObjetivo: publicosObjetivo.map((link) => link.publicoObjetivo),
    requirements: requisitos.map((link) => ({ id: link.requisito.id, name: link.requisito.nombre, slug: link.requisito.slug, type: link.requisito.tipo, requiresDocument: link.requisito.requiereDocumento, mandatory: link.obligatorio, obligatoriness: link.requisito.obligatoriedad, suppliedByInstitution: link.requisito.provistoPorInstitucion, requiresConfirmation: link.requisito.requiereConfirmacion, checkAtEntry: link.requisito.controlarAlIngreso, appliesEveryClass: link.requisito.aplicaEnCadaClase, observations: link.observaciones, instructions: link.requisito.instrucciones, order: link.orden, active: link.requisito.activo })),
  };
}

const MEDICAL_SLUG = "certificado-medico";
const AUTHORIZATION_SLUG = "autorizacion-de-tutor";
async function validateAndSyncRequirements(tx: Prisma.TransactionClient, actividadId: string, items: ActividadInput["requirements"], currentIds: Set<string> = new Set()) {
  const ids = items.map((item) => item.requisitoId);
  const requirements = await tx.requisito.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true, activo: true } });
  if (requirements.length !== ids.length) throw new CatalogValidationError("Uno o más requisitos no existen.");
  if (requirements.some((item) => !item.activo && !currentIds.has(item.id))) throw new CatalogValidationError("No se pueden agregar requisitos inactivos.");
  await tx.actividadRequisito.deleteMany({ where: { actividadId } });
  if (items.length) await tx.actividadRequisito.createMany({ data: items.map((item) => ({ id: randomUUID(), actividadId, requisitoId: item.requisitoId, obligatorio: item.obligatorio, observaciones: item.observaciones || null, orden: item.orden })) });
  const slugs = new Set(requirements.map((item) => item.slug));
  await tx.actividad.update({ where: { id: actividadId }, data: { requiereCertificadoMedico: slugs.has(MEDICAL_SLUG), requiereAutorizacion: slugs.has(AUTHORIZATION_SLUG) } });
}

function toDecimal(value: string | null | undefined) {
  return value == null ? null : new Prisma.Decimal(value);
}

function validateFinalGeneralState(value: unknown) {
  const parsed = activityGeneralStateSchema.safeParse(value);
  if (!parsed.success) {
    throw new CatalogValidationError(
      parsed.error.issues[0]?.message ?? "Los datos generales no son válidos.",
    );
  }
  return parsed.data;
}

function toDiaSemana(value: string): DiaSemana {
  const normalized = value.trim().toUpperCase() as DiaSemana;
  return Object.values(DiaSemana).includes(normalized)
    ? normalized
    : DiaSemana.LUNES;
}

function buildWhere(filters: ActividadFilters): Prisma.ActividadWhereInput {
  const where: Prisma.ActividadWhereInput = {};

  if (filters.nombre?.trim()) {
    where.nombre = { contains: filters.nombre.trim(), mode: "insensitive" };
  }
  if (filters.estado?.trim()) {
    where.estado = filters.estado as ActividadEstado;
  }
  if (filters.establecimientoId) {
    where.establecimientoId = filters.establecimientoId;
  }
  if (filters.categoriaActividadId) {
    where.categoriaActividadId = filters.categoriaActividadId;
  }
  if (filters.publicoObjetivoId) {
    where.publicosObjetivo = {
      some: { publicoObjetivoId: filters.publicoObjetivoId },
    };
  }
  if (filters.nivel) {
    where.nivel = filters.nivel as ActividadNivel;
  }
  if (filters.esGratuita !== undefined) {
    where.esGratuita = filters.esGratuita;
  }
  if (filters.requiereCertificadoMedico !== undefined) {
    where.requiereCertificadoMedico = filters.requiereCertificadoMedico;
  }
  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { nombre: { contains: search, mode: "insensitive" } },
      { descripcion: { contains: search, mode: "insensitive" } },
      { descripcionCorta: { contains: search, mode: "insensitive" } },
      {
        establecimiento: {
          is: { nombre: { contains: search, mode: "insensitive" } },
        },
      },
      {
        categoriaActividad: {
          is: { nombre: { contains: search, mode: "insensitive" } },
        },
      },
      {
        publicosObjetivo: {
          some: {
            publicoObjetivo: {
              is: { nombre: { contains: search, mode: "insensitive" } },
            },
          },
        },
      },
    ];
  }

  return where;
}

async function validateCategory(
  tx: DbClient,
  id: string | null | undefined,
  currentId?: string | null,
) {
  if (id == null) return null;

  const category = await tx.categoriaActividad.findUnique({
    where: { id },
    select: { id: true, slug: true, activo: true },
  });

  if (!category) {
    throw new CatalogValidationError("La categoría seleccionada no existe.");
  }
  if (!category.activo && category.id !== currentId) {
    throw new CatalogValidationError(
      "La categoría seleccionada está inactiva.",
    );
  }

  return category;
}

async function validatePublics(
  tx: DbClient,
  ids: string[],
  currentIds: Set<string> = new Set(),
) {
  if (new Set(ids).size !== ids.length) {
    throw new CatalogValidationError(
      "Los públicos objetivo no pueden repetirse.",
    );
  }

  const publics = await tx.publicoObjetivo.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      activo: true,
      edadMinimaSugerida: true,
      edadMaximaSugerida: true,
    },
  });

  if (publics.length !== ids.length) {
    throw new CatalogValidationError("Uno o más públicos objetivo no existen.");
  }
  if (publics.some((item) => !item.activo && !currentIds.has(item.id))) {
    throw new CatalogValidationError(
      "No se pueden agregar públicos objetivo inactivos.",
    );
  }

  return publics;
}

function deriveLegacyAgeRange(
  publics: Array<{
    edadMinimaSugerida: number | null;
    edadMaximaSugerida: number | null;
  }>,
) {
  if (publics.length === 0) return { edadMinima: null, edadMaxima: null };
  if (
    publics.some(
      (item) =>
        item.edadMinimaSugerida === null &&
        item.edadMaximaSugerida === null,
    )
  ) {
    return { edadMinima: null, edadMaxima: null };
  }

  return {
    edadMinima: Math.min(
      ...publics.map((item) => item.edadMinimaSugerida ?? 0),
    ),
    edadMaxima: publics.some((item) => item.edadMaximaSugerida === null)
      ? null
      : Math.max(...publics.map((item) => item.edadMaximaSugerida ?? 0)),
  };
}

async function syncPublics(
  tx: Prisma.TransactionClient,
  actividadId: string,
  currentIds: Set<string>,
  targetIds: string[],
) {
  const targetSet = new Set(targetIds);
  const removeIds = [...currentIds].filter((id) => !targetSet.has(id));
  const addIds = targetIds.filter((id) => !currentIds.has(id));

  if (removeIds.length) {
    await tx.actividadPublicoObjetivo.deleteMany({
      where: { actividadId, publicoObjetivoId: { in: removeIds } },
    });
  }
  if (addIds.length) {
    await tx.actividadPublicoObjetivo.createMany({
      data: addIds.map((publicoObjetivoId) => ({
        id: randomUUID(),
        actividadId,
        publicoObjetivoId,
      })),
      skipDuplicates: true,
    });
  }
}

const ACTIVITY_STATE_REASON = "Cambio de estado de la actividad";
const DAY_INDEX: Record<DiaSemana, number> = { DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6 };

function operationalNow() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { now, today, time };
}

async function futureSessionIds(tx: Prisma.TransactionClient, actividadId: string) {
  const { today, time } = operationalNow();
  const rows = await tx.claseActividad.findMany({
    where: {
      horarioActividad: { actividadId },
      asistenciaCerradaAt: null,
      estado: { notIn: ["FINALIZADA", "CANCELADA"] },
      OR: [{ fecha: { gt: today } }, { fecha: today, horaInicio: { gte: time } }],
    },
    select: { id: true },
  });
  return rows.map((item) => item.id);
}

async function propagateActivityState(tx: Prisma.TransactionClient, actividadId: string, previous: ActividadEstado, next: ActividadEstado) {
  if (previous === next) return;
  const ids = await futureSessionIds(tx, actividadId);
  const scheduleStatus = next === ActividadEstado.ACTIVA ? "ACTIVO" : next === ActividadEstado.SUSPENDIDA || next === ActividadEstado.BLOQUEADA ? "SUSPENDIDO" : next === ActividadEstado.FINALIZADA || next === ActividadEstado.CANCELADA ? "FINALIZADO" : null;
  if (scheduleStatus) await tx.horarioActividad.updateMany({ where: { actividadId, estado: { not: "CANCELADO" } }, data: { estado: scheduleStatus } });
  if (!ids.length) return;
  if (next === ActividadEstado.SUSPENDIDA || next === ActividadEstado.BLOQUEADA) {
    await tx.claseActividad.updateMany({ where: { id: { in: ids } }, data: { estado: "SUSPENDIDA", motivoCancelacion: ACTIVITY_STATE_REASON } });
  } else if (next === ActividadEstado.FINALIZADA || next === ActividadEstado.CANCELADA) {
    await tx.reservaRecurso.updateMany({ where: { reservaClase: { claseActividadId: { in: ids } }, estado: { not: "CANCELADA" } }, data: { estado: "CANCELADA" } });
    await tx.reservaClase.updateMany({ where: { claseActividadId: { in: ids }, estado: { in: ["RESERVADA", "LISTA_ESPERA", "OFRECIDA"] } }, data: { estado: "CANCELADA", canceladoAt: operationalNow().now, motivoCancelacion: ACTIVITY_STATE_REASON } });
    await tx.claseActividad.updateMany({ where: { id: { in: ids } }, data: { estado: "CANCELADA", motivoCancelacion: ACTIVITY_STATE_REASON } });
  } else if (next === ActividadEstado.ACTIVA) {
    await tx.claseActividad.updateMany({ where: { id: { in: ids }, estado: "SUSPENDIDA", motivoCancelacion: ACTIVITY_STATE_REASON }, data: { estado: "PROGRAMADA", motivoCancelacion: null } });
  }
}

async function notifyActivityChange(tx: Prisma.TransactionClient, actividadId: string, activityName: string, message: string) {
  const enrollmentUsers = await tx.inscripcion.findMany({ where: { horarioActividad: { actividadId }, estado: { in: ["PENDIENTE", "CONFIRMADA", "LISTA_ESPERA"] } }, select: { usuarioId: true } });
  const reservationUsers = await tx.reservaClase.findMany({ where: { claseActividad: { horarioActividad: { actividadId } }, estado: { in: ["RESERVADA", "LISTA_ESPERA", "OFRECIDA"] } }, select: { usuarioId: true } });
  const userIds = [...new Set([...enrollmentUsers, ...reservationUsers].map((item) => item.usuarioId))];
  if (!userIds.length) return;
  const { createNotifications } = await import("@/features/notifications/services/notifications.server");
  const stamp = Date.now();
  await createNotifications(userIds.map((userId) => ({ userId, type: "GENERAL" as const, title: `Cambio en ${activityName}`, message, priority: "ALTA" as const, actionUrl: "/citizen/schedule", actionLabel: "Ver próximas clases", entityType: "activity", entityId: actividadId, deduplicationKey: `activity-change:${actividadId}:${userId}:${stamp}` })), tx);
}

async function syncSchedules(
  tx: Prisma.TransactionClient,
  actividadId: string,
  schedules: ActividadInput["horarios"],
  establecimientoId: string,
  cupoMaximo: number,
) {
  const existing = await tx.horarioActividad.findMany({ where: { actividadId }, include: { clases: { where: { asistenciaCerradaAt: null, estado: { notIn: ["FINALIZADA", "CANCELADA"] } }, orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }] } } });
  const operational = operationalNow();
  const horizon = existing.flatMap((item) => item.clases).reduce<Date | null>((latest, item) => !latest || item.fecha > latest ? item.fecha : latest, null);
  const retained = new Set(schedules.flatMap((item) => item.id ? [item.id] : []));
  const removed = existing.filter((item) => !retained.has(item.id));
  for (const item of removed) {
    await tx.horarioActividad.update({ where: { id: item.id }, data: { estado: "CANCELADO" } });
    const futureIds = item.clases.filter((row) => row.fecha > operational.today || (row.fecha.getTime() === operational.today.getTime() && row.horaInicio >= operational.time)).map((row) => row.id);
    if (futureIds.length) {
      await tx.reservaRecurso.updateMany({ where: { reservaClase: { claseActividadId: { in: futureIds } }, estado: { not: "CANCELADA" } }, data: { estado: "CANCELADA" } });
      await tx.reservaClase.updateMany({ where: { claseActividadId: { in: futureIds }, estado: { in: ["RESERVADA", "LISTA_ESPERA", "OFRECIDA"] } }, data: { estado: "CANCELADA", canceladoAt: operational.now, motivoCancelacion: "Horario retirado de la programación" } });
      await tx.claseActividad.updateMany({ where: { id: { in: futureIds } }, data: { estado: "CANCELADA", motivoCancelacion: "Horario retirado de la programación" } });
    }
  }
  for (const item of schedules) {
    const day = toDiaSemana(item.diaSemana);
    const current = item.id ? existing.find((row) => row.id === item.id) : undefined;
    if (!current) {
      const created = await tx.horarioActividad.create({ data: { id: randomUUID(), actividadId, establecimientoId, cupoMaximo: Math.max(cupoMaximo, 1), diaSemana: day, horaInicio: item.horaInicio, horaFin: item.horaFin } });
      if (horizon) {
        for (let date = new Date(operational.today); date <= horizon; date = new Date(date.getTime() + 86_400_000)) {
          if (date.getUTCDay() !== DAY_INDEX[day] || (date.getTime() === operational.today.getTime() && item.horaInicio < operational.time)) continue;
          await tx.claseActividad.create({ data: { horarioActividadId: created.id, fecha: date, horaInicio: item.horaInicio, horaFin: item.horaFin, establecimientoId, cupoMaximo: Math.max(cupoMaximo, 1), estado: "PROGRAMADA" } });
        }
      }
      continue;
    }
    await tx.horarioActividad.update({ where: { id: current.id }, data: { establecimientoId, cupoMaximo: Math.max(cupoMaximo, 1), diaSemana: day, horaInicio: item.horaInicio, horaFin: item.horaFin, estado: "ACTIVO" } });
    const future = current.clases.filter((row) => row.fecha > operational.today || (row.fecha.getTime() === operational.today.getTime() && row.horaInicio >= operational.time));
    for (const session of future) {
      let date = session.fecha;
      if (current.diaSemana !== day) {
        const delta = (DAY_INDEX[day] - DAY_INDEX[current.diaSemana] + 7) % 7;
        date = new Date(session.fecha.getTime() + (delta || 7) * 86_400_000);
      }
      await tx.claseActividad.update({ where: { id: session.id }, data: { fecha: date, horaInicio: item.horaInicio, horaFin: item.horaFin, establecimientoId, cupoMaximo: Math.max(cupoMaximo, 1) } });
    }
  }
}

async function replaceSchedulesAndAssignees(
  tx: Prisma.TransactionClient,
  actividadId: string,
  input: Pick<ActividadInput, "horarios" | "asignados">,
  establecimientoId: string,
  cupoMaximo: number,
) {
  await tx.actividadUsuario.deleteMany({ where: { actividadId } });
  await syncSchedules(tx, actividadId, input.horarios, establecimientoId, cupoMaximo);
  if (input.asignados.length) {
    await tx.actividadUsuario.createMany({
      data: input.asignados.map((asignado) => ({
        actividadId,
        usuarioId: asignado.usuarioId,
        funcion: asignado.funcion || null,
        activo: asignado.activo,
      })),
    });
  }
}

export async function listActividades(filters: ActividadFilters = {}) {
  const records = await prisma.actividad.findMany({
    where: buildWhere(filters),
    orderBy: { nombre: "asc" },
    include: actividadInclude,
  });
  return records.map(mapActividad);
}

export async function getActividad(id: string) {
  const record = await prisma.actividad.findUnique({
    where: { id },
    include: actividadInclude,
  });
  return record ? mapActividad(record) : null;
}

export async function createActividad(input: ActividadInput) {
  return prisma.$transaction(
    async (tx) => {
      const category = await validateCategory(tx, input.categoriaActividadId);
      const publics = await validatePublics(tx, input.publicosObjetivoIds);
      const ageRange = deriveLegacyAgeRange(publics);
      const id = randomUUID();
      const legacyCategory = category
        ? LEGACY_CATEGORY_BY_SLUG[category.slug]
        : undefined;
      const estado = resolveActivityState(input.estado, input.estadoTexto);

      await tx.actividad.create({
        data: {
          id,
          nombre: input.nombre,
          descripcionCorta: input.descripcionCorta ?? null,
          descripcion: input.descripcion || null,
          imagenUrl: input.imagenUrl ?? null,
          color: input.color ?? null,
          nivel: input.nivel ?? null,
          edadMinima: ageRange.edadMinima,
          edadMaxima: ageRange.edadMaxima,
          requiereCertificadoMedico: input.requiereCertificadoMedico,
          requiereAutorizacion: input.requiereAutorizacion,
          esGratuita: input.esGratuita,
          precio: input.esGratuita ? null : toDecimal(input.precio),
          establecimientoId: input.establecimientoId,
          categoriaActividadId: category?.id ?? null,
          ...(legacyCategory ? { categoria: legacyCategory } : {}),
          cupo: input.cupo ?? null,
          cupoMaximo: input.cupo ?? 0,
          estado,
          estadoTexto: toLegacyStateText(estado),
          modalidadInscripcion: input.modalidadInscripcion,
          duracionPeriodoMeses: input.modalidadInscripcion === "POR_PERIODO" ? input.duracionPeriodoMeses : null,
          horasCancelacionJustificada: input.horasCancelacionJustificada,
          modalidadOperacion: input.modalidadOperacion,
          vigenciaReserva: input.vigenciaReserva,
          duracionTurnoMinutos: input.duracionTurnoMinutos,
          intervaloTurnoMinutos: input.intervaloTurnoMinutos,
          anticipacionReservaDias: input.anticipacionReservaDias,
          limiteReservasPorUsuario: input.limiteReservasPorUsuario,
          requiereReserva: input.requiereReserva,
        },
      });
      await replaceSchedulesAndAssignees(tx, id, input, input.establecimientoId, input.cupo ?? 1);
      await syncPublics(tx, id, new Set(), input.publicosObjetivoIds);
      await validateAndSyncRequirements(tx, id, input.requirements);

      const record = await tx.actividad.findUniqueOrThrow({
        where: { id },
        include: actividadInclude,
      });
      return mapActividad(record);
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

export async function updateActividad(id: string, input: ActividadInput) {
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.actividad.findUnique({
        where: { id },
        include: { publicosObjetivo: true, requisitos: true },
      });
      if (!current) throw new CatalogNotFoundError("Actividad no encontrada.");

      const category = await validateCategory(
        tx,
        input.categoriaActividadId,
        current.categoriaActividadId,
      );
      const currentPublicIds = new Set(
        current.publicosObjetivo.map((item) => item.publicoObjetivoId),
      );
      const publics = await validatePublics(
        tx,
        input.publicosObjetivoIds,
        currentPublicIds,
      );
      const ageRange = deriveLegacyAgeRange(publics);
      const legacyCategory = category
        ? LEGACY_CATEGORY_BY_SLUG[category.slug]
        : undefined;
      const estado = resolveActivityState(input.estado, input.estadoTexto);

      await tx.actividad.update({
        where: { id },
        data: {
          nombre: input.nombre,
          descripcionCorta: input.descripcionCorta ?? null,
          descripcion: input.descripcion || null,
          imagenUrl: input.imagenUrl ?? null,
          color: input.color ?? null,
          nivel: input.nivel ?? null,
          edadMinima: ageRange.edadMinima,
          edadMaxima: ageRange.edadMaxima,
          requiereCertificadoMedico: input.requiereCertificadoMedico,
          requiereAutorizacion: input.requiereAutorizacion,
          esGratuita: input.esGratuita,
          precio: input.esGratuita ? null : toDecimal(input.precio),
          establecimientoId: input.establecimientoId,
          ...(input.categoriaActividadId !== undefined
            ? { categoriaActividadId: category?.id ?? null }
            : {}),
          ...(legacyCategory ? { categoria: legacyCategory } : {}),
          cupo: input.cupo ?? null,
          cupoMaximo: input.cupo ?? 0,
          estado,
          estadoTexto: toLegacyStateText(estado),
          modalidadInscripcion: input.modalidadInscripcion,
          duracionPeriodoMeses: input.modalidadInscripcion === "POR_PERIODO" ? input.duracionPeriodoMeses : null,
          horasCancelacionJustificada: input.horasCancelacionJustificada,
          modalidadOperacion: input.modalidadOperacion,
          vigenciaReserva: input.vigenciaReserva,
          duracionTurnoMinutos: input.duracionTurnoMinutos,
          intervaloTurnoMinutos: input.intervaloTurnoMinutos,
          anticipacionReservaDias: input.anticipacionReservaDias,
          limiteReservasPorUsuario: input.limiteReservasPorUsuario,
          requiereReserva: input.requiereReserva,
        },
      });
      await replaceSchedulesAndAssignees(tx, id, input, input.establecimientoId, input.cupo ?? 1);
      await propagateActivityState(tx, id, current.estado, estado);
      await notifyActivityChange(tx, id, input.nombre, estado !== current.estado ? `La actividad cambió su estado a ${toLegacyStateText(estado)}. Revisá tus próximas clases.` : "La programación de la actividad fue actualizada. Revisá los días y horarios de tus próximas clases.");
      await syncPublics(tx, id, currentPublicIds, input.publicosObjetivoIds);
      await validateAndSyncRequirements(tx, id, input.requirements, new Set(current.requisitos.map((item) => item.requisitoId)));

      const record = await tx.actividad.findUniqueOrThrow({
        where: { id },
        include: actividadInclude,
      });
      return mapActividad(record);
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

export async function patchActividad(id: string, input: UpdateActividadInput) {
  return prisma.$transaction(
    async (tx) => {
      const current = await tx.actividad.findUnique({
        where: { id },
        include: { publicosObjetivo: true, requisitos: true },
      });
      if (!current) throw new CatalogNotFoundError("Actividad no encontrada.");

      let category;
      if (input.categoriaActividadId !== undefined) {
        category = await validateCategory(
          tx,
          input.categoriaActividadId,
          current.categoriaActividadId,
        );
      }
      const currentPublicIds = new Set(
        current.publicosObjetivo.map((item) => item.publicoObjetivoId),
      );

      const finalGeneral = validateFinalGeneralState({
        descripcionCorta:
          input.descripcionCorta !== undefined
            ? input.descripcionCorta
            : current.descripcionCorta,
        descripcion:
          input.descripcion !== undefined
            ? input.descripcion
            : current.descripcion,
        imagenUrl:
          input.imagenUrl !== undefined ? input.imagenUrl : current.imagenUrl,
        color: input.color !== undefined ? input.color : current.color,
        nivel: input.nivel !== undefined ? input.nivel : current.nivel,
        edadMinima: current.edadMinima,
        edadMaxima: current.edadMaxima,
        requiereCertificadoMedico:
          input.requiereCertificadoMedico ?? current.requiereCertificadoMedico,
        requiereAutorizacion:
          input.requiereAutorizacion ?? current.requiereAutorizacion,
        esGratuita: input.esGratuita ?? current.esGratuita,
        precio:
          input.precio !== undefined
            ? input.precio
            : (current.precio?.toFixed(2) ?? null),
      });
      const publicAgeRange =
        input.publicosObjetivoIds === undefined
          ? null
          : deriveLegacyAgeRange(
              await validatePublics(
                tx,
                input.publicosObjetivoIds,
                currentPublicIds,
              ),
            );
      if (input.requirements !== undefined) {
        await validateAndSyncRequirements(tx, id, input.requirements, new Set(current.requisitos.map((item) => item.requisitoId)));
      }

      const legacyCategory = category
        ? LEGACY_CATEGORY_BY_SLUG[category.slug]
        : undefined;
      const finalState =
        input.estado !== undefined || input.estadoTexto !== undefined
          ? resolveActivityState(input.estado, input.estadoTexto)
          : current.estado;
      await tx.actividad.update({
        where: { id },
        data: {
          ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
          ...(input.descripcionCorta !== undefined
            ? { descripcionCorta: input.descripcionCorta }
            : {}),
          ...(input.descripcion !== undefined
            ? { descripcion: input.descripcion || null }
            : {}),
          ...(input.imagenUrl !== undefined
            ? { imagenUrl: input.imagenUrl }
            : {}),
          ...(input.color !== undefined ? { color: input.color } : {}),
          ...(input.nivel !== undefined ? { nivel: input.nivel } : {}),
          ...(publicAgeRange ?? {}),
          ...(input.requiereCertificadoMedico !== undefined
            ? { requiereCertificadoMedico: input.requiereCertificadoMedico }
            : {}),
          ...(input.requiereAutorizacion !== undefined
            ? { requiereAutorizacion: input.requiereAutorizacion }
            : {}),
          ...(input.esGratuita !== undefined
            ? { esGratuita: input.esGratuita }
            : {}),
          ...(input.esGratuita !== undefined || input.precio !== undefined
            ? {
                precio: finalGeneral.esGratuita
                  ? null
                  : toDecimal(finalGeneral.precio),
              }
            : {}),
          ...(input.establecimientoId !== undefined
            ? { establecimientoId: input.establecimientoId }
            : {}),
          ...(input.categoriaActividadId !== undefined
            ? { categoriaActividadId: category?.id ?? null }
            : {}),
          ...(legacyCategory ? { categoria: legacyCategory } : {}),
          ...(input.cupo !== undefined
            ? { cupo: input.cupo, cupoMaximo: input.cupo ?? 0 }
            : {}),
          ...(input.estado !== undefined || input.estadoTexto !== undefined
            ? {
                estado: finalState,
                estadoTexto: toLegacyStateText(finalState),
              }
            : {}),
          ...(input.modalidadInscripcion !== undefined
            ? { modalidadInscripcion: input.modalidadInscripcion }
            : {}),
          ...(input.duracionPeriodoMeses !== undefined || input.modalidadInscripcion !== undefined
            ? { duracionPeriodoMeses: input.modalidadInscripcion === "POR_PERIODO" ? input.duracionPeriodoMeses : null }
            : {}),
          ...(input.horasCancelacionJustificada !== undefined
            ? { horasCancelacionJustificada: input.horasCancelacionJustificada }
            : {}),
          ...(input.modalidadOperacion !== undefined ? { modalidadOperacion: input.modalidadOperacion } : {}),
          ...(input.vigenciaReserva !== undefined ? { vigenciaReserva: input.vigenciaReserva } : {}),
          ...(input.duracionTurnoMinutos !== undefined ? { duracionTurnoMinutos: input.duracionTurnoMinutos } : {}),
          ...(input.intervaloTurnoMinutos !== undefined ? { intervaloTurnoMinutos: input.intervaloTurnoMinutos } : {}),
          ...(input.anticipacionReservaDias !== undefined ? { anticipacionReservaDias: input.anticipacionReservaDias } : {}),
          ...(input.limiteReservasPorUsuario !== undefined ? { limiteReservasPorUsuario: input.limiteReservasPorUsuario } : {}),
          ...(input.requiereReserva !== undefined ? { requiereReserva: input.requiereReserva } : {}),
        },
      });

      if (input.horarios !== undefined) {
        await syncSchedules(tx, id, input.horarios, input.establecimientoId ?? current.establecimientoId, input.cupo ?? current.cupoMaximo);
      }
      if (input.asignados !== undefined) {
        await tx.actividadUsuario.deleteMany({ where: { actividadId: id } });
        if (input.asignados.length) {
          await tx.actividadUsuario.createMany({
            data: input.asignados.map((asignado) => ({
              actividadId: id,
              usuarioId: asignado.usuarioId,
              funcion: asignado.funcion || null,
              activo: asignado.activo,
            })),
          });
        }
      }
      if (input.publicosObjetivoIds !== undefined) {
        await syncPublics(tx, id, currentPublicIds, input.publicosObjetivoIds);
      }
      await propagateActivityState(tx, id, current.estado, finalState);
      const operationalChange = input.horarios !== undefined || input.establecimientoId !== undefined || input.cupo !== undefined || finalState !== current.estado;
      if (operationalChange) await notifyActivityChange(tx, id, input.nombre ?? current.nombre, finalState !== current.estado ? `La actividad cambió su estado a ${toLegacyStateText(finalState)}. Revisá tus próximas clases.` : "La programación de la actividad fue actualizada. Revisá los días y horarios de tus próximas clases.");

      const record = await tx.actividad.findUniqueOrThrow({
        where: { id },
        include: actividadInclude,
      });
      return mapActividad(record);
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}

export async function deleteActividad(id: string) {
  const current = await prisma.actividad.findUnique({ where: { id } });
  if (!current) throw new CatalogNotFoundError("Actividad no encontrada.");

  return prisma.actividad.update({
    where: { id },
    data: {
      estado: ActividadEstado.CANCELADA,
      estadoTexto: toLegacyStateText(ActividadEstado.CANCELADA),
    },
  });
}

export type ActivityDeletionPreview = {
  id: string;
  name: string;
  state: string;
  schedules: number;
  sessions: number;
  futureSessions: number;
  enrollments: number;
  affectedUsers: number;
  reservations: number;
  attendanceRecords: number;
  enrollmentDocuments: number;
  accessRecords: number;
  canPurge: boolean;
  purgeBlockedReason: string | null;
};

export async function getActivityDeletionPreview(id: string): Promise<ActivityDeletionPreview> {
  const activity = await prisma.actividad.findUnique({ where: { id }, select: { id: true, nombre: true, estado: true } });
  if (!activity) throw new CatalogNotFoundError("Actividad no encontrada.");
  const scheduleWhere = { horarioActividad: { actividadId: id } };
  const operational = operationalNow();
  const futureWhere: Prisma.ClaseActividadWhereInput = { ...scheduleWhere, asistenciaCerradaAt: null, estado: { notIn: ["FINALIZADA", "CANCELADA"] }, OR: [{ fecha: { gt: operational.today } }, { fecha: operational.today, horaInicio: { gte: operational.time } }] };
  const [schedules, sessions, futureSessions, enrollments, affectedEnrollmentUsers, affectedReservationUsers, reservations, attendanceRecords, enrollmentDocuments, accessRecords] = await Promise.all([
    prisma.horarioActividad.count({ where: { actividadId: id } }),
    prisma.claseActividad.count({ where: scheduleWhere }),
    prisma.claseActividad.count({ where: futureWhere }),
    prisma.inscripcion.count({ where: scheduleWhere }),
    prisma.inscripcion.findMany({ where: { ...scheduleWhere, estado: { in: ["PENDIENTE", "CONFIRMADA", "LISTA_ESPERA"] } }, select: { usuarioId: true } }),
    prisma.reservaClase.findMany({ where: { claseActividad: futureWhere, estado: { in: ["RESERVADA", "LISTA_ESPERA", "OFRECIDA"] } }, select: { usuarioId: true } }),
    prisma.reservaClase.count({ where: { claseActividad: scheduleWhere } }),
    prisma.asistencia.count({ where: { claseActividad: scheduleWhere } }),
    prisma.documentoInscripcion.count({ where: { inscripcion: scheduleWhere } }),
    prisma.registroAcceso.count({ where: { OR: [{ claseActividad: scheduleWhere }, { inscripcion: scheduleWhere }] } }),
  ]);
  const hasHistory = attendanceRecords > 0 || accessRecords > 0;
  const affectedUsers = new Set([...affectedEnrollmentUsers, ...affectedReservationUsers].map((item) => item.usuarioId)).size;
  const canPurge = activity.estado === "BORRADOR" && !hasHistory;
  return {
    id: activity.id,
    name: activity.nombre,
    state: activity.estado,
    schedules,
    sessions,
    futureSessions,
    enrollments,
    affectedUsers,
    reservations,
    attendanceRecords,
    enrollmentDocuments,
    accessRecords,
    canPurge,
    purgeBlockedReason: canPurge ? null : activity.estado !== "BORRADOR" ? "Sólo se pueden eliminar definitivamente actividades en borrador." : "La actividad posee asistencias o accesos históricos y debe conservarse.",
  };
}

export async function archiveActivity(id: string, reason: string) {
  const cleanReason = reason.trim();
  if (cleanReason.length < 3) throw new CatalogValidationError("Indicá el motivo de la baja.");
  return prisma.$transaction(async (tx) => {
    const activity = await tx.actividad.findUnique({ where: { id }, select: { id: true, nombre: true, estado: true } });
    if (!activity) throw new CatalogNotFoundError("Actividad no encontrada.");
    const now = new Date();
    const futureSessions = await tx.claseActividad.findMany({ where: { horarioActividad: { actividadId: id }, fecha: { gte: now }, estado: { notIn: ["FINALIZADA", "CANCELADA"] } }, select: { id: true } });
    const sessionIds = futureSessions.map((session) => session.id);
    if (sessionIds.length) {
      await tx.reservaRecurso.updateMany({ where: { reservaClase: { claseActividadId: { in: sessionIds } }, estado: { not: "CANCELADA" } }, data: { estado: "CANCELADA" } });
      await tx.reservaClase.updateMany({ where: { claseActividadId: { in: sessionIds }, estado: { in: ["RESERVADA", "LISTA_ESPERA", "OFRECIDA"] } }, data: { estado: "CANCELADA", canceladoAt: now, motivoCancelacion: cleanReason } });
      await tx.claseActividad.updateMany({ where: { id: { in: sessionIds } }, data: { estado: "CANCELADA", motivoCancelacion: cleanReason } });
    }
    const users = await tx.inscripcion.findMany({ where: { horarioActividad: { actividadId: id }, estado: { in: ["PENDIENTE", "CONFIRMADA", "LISTA_ESPERA"] } }, select: { usuarioId: true } });
    await tx.inscripcion.updateMany({ where: { horarioActividad: { actividadId: id }, estado: { in: ["PENDIENTE", "CONFIRMADA", "LISTA_ESPERA"] } }, data: { estado: "BAJA", fechaCancelacion: now, motivoCancelacion: cleanReason } });
    await tx.horarioActividad.updateMany({ where: { actividadId: id, estado: { not: "FINALIZADO" } }, data: { estado: "CANCELADO" } });
    const updated = await tx.actividad.update({ where: { id }, data: { estado: "CANCELADA", estadoTexto: toLegacyStateText(ActividadEstado.CANCELADA) } });
    const userIds = [...new Set(users.map((item) => item.usuarioId))];
    if (userIds.length) {
      const { createNotifications } = await import("@/features/notifications/services/notifications.server");
      await createNotifications(userIds.map((userId) => ({ userId, type: "GENERAL", title: "Actividad dada de baja", message: `${activity.nombre} fue dada de baja. Motivo: ${cleanReason}`, priority: "ALTA", actionUrl: "/citizen/enrollments", actionLabel: "Ver mis inscripciones", entityType: "activity", entityId: id, deduplicationKey: `activity-archived:${id}:${userId}:${now.getTime()}` })), tx);
    }
    return { activity: updated, cancelledSessions: sessionIds.length, notifiedUsers: userIds.length };
  }, { maxWait: 10_000, timeout: 30_000 });
}

export async function purgeActivity(id: string) {
  const preview = await getActivityDeletionPreview(id);
  if (!preview.canPurge) throw new CatalogValidationError(preview.purgeBlockedReason ?? "La actividad no se puede eliminar definitivamente.");
  await prisma.$transaction(async (tx) => {
    const schedules = await tx.horarioActividad.findMany({ where: { actividadId: id }, select: { id: true, clases: { select: { id: true } }, inscripciones: { select: { id: true } } } });
    const classIds = schedules.flatMap((schedule) => schedule.clases.map((item) => item.id));
    const enrollmentIds = schedules.flatMap((schedule) => schedule.inscripciones.map((item) => item.id));
    if (classIds.length) {
      const reservationIds = (await tx.reservaClase.findMany({ where: { claseActividadId: { in: classIds } }, select: { id: true } })).map((item) => item.id);
      if (reservationIds.length) await tx.reservaRecurso.deleteMany({ where: { reservaClaseId: { in: reservationIds } } });
      await tx.reservaClase.deleteMany({ where: { claseActividadId: { in: classIds } } });
      await tx.asistencia.deleteMany({ where: { claseActividadId: { in: classIds } } });
      await tx.claseActividad.deleteMany({ where: { id: { in: classIds } } });
    }
    if (enrollmentIds.length) {
      await tx.documentoInscripcion.deleteMany({ where: { inscripcionId: { in: enrollmentIds } } });
      await tx.inscripcion.deleteMany({ where: { id: { in: enrollmentIds } } });
    }
    await tx.actividadBorrador.deleteMany({ where: { actividadId: id } });
    await tx.horarioActividad.deleteMany({ where: { actividadId: id } });
    await tx.actividad.delete({ where: { id } });
  }, { maxWait: 10_000, timeout: 30_000 });
  return preview;
}
