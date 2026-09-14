import { z } from "zod";
import { ACTIVIDAD_MODALIDADES } from "@/features/actividades/schemas/actividad.schema";
import { calculateMonthlyEndDate } from "../helpers/activity-period";

export const activityDraftPayloadSchema = z.object({
  modalidadOperacion: z.enum(ACTIVIDAD_MODALIDADES).nullable().default(null),
  nombre: z.string().default(""), descripcionCorta: z.string().nullable().default(null), descripcion: z.string().nullable().default(null), imagenUrl: z.string().nullable().default(null), color: z.string().nullable().default(null),
  categoriaActividadId: z.string().nullable().default(null), nivel: z.enum(["INICIAL", "INTERMEDIO", "AVANZADO"]).nullable().default(null), edadMinima: z.number().nullable().default(null), edadMaxima: z.number().nullable().default(null), esGratuita: z.boolean().default(true), precio: z.string().nullable().default(null),
  establecimientoIds: z.array(z.string()).default([]), cupo: z.number().nullable().default(null), publicosObjetivoIds: z.array(z.string()).default([]), requirements: z.array(z.object({ requisitoId: z.string(), obligatorio: z.boolean().default(true), observaciones: z.string().nullable().default(null), orden: z.number().default(0) })).default([]),
  modalidadInscripcion: z.enum(["PERMANENTE", "POR_PERIODO", "POR_CLASE"]).default("PERMANENTE"), vigenciaReserva: z.enum(["INDEFINIDA", "MENSUAL", "PERIODO_DEFINIDO", "UNICA"]).default("INDEFINIDA"), duracionPeriodoMeses: z.number().nullable().default(null), duracionTurnoMinutos: z.number().nullable().default(null), intervaloTurnoMinutos: z.number().default(0), anticipacionReservaDias: z.number().default(30), limiteReservasPorUsuario: z.number().nullable().default(null), requiereReserva: z.boolean().default(true), horasCancelacionJustificada: z.number().default(24),
  generacionClasesDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null), generacionClasesHasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null), fechasExcluidas: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
  schedules: z.array(z.object({ id: z.string().optional(), establecimientoId: z.string().min(1), diaSemana: z.enum(["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]), horaInicio: z.string(), horaFin: z.string(), espacio: z.string().nullable().default(null), cupoMaximo: z.number().min(1), profesorIds: z.array(z.string()).default([]), recursoIds: z.array(z.string()).default([]), teacherAssignments: z.array(z.object({ startTime: z.string(), endTime: z.string(), professorIds: z.array(z.string()).default([]) })).default([]) })).default([]),
}).transform((payload) => payload.vigenciaReserva === "MENSUAL" ? { ...payload, generacionClasesHasta: calculateMonthlyEndDate(payload.generacionClasesDesde) } : payload);
export const saveActivityDraftSchema = z.object({ expectedUpdatedAt: z.string().datetime(), pasoActual: z.number().int().min(1).max(11).optional(), payload: activityDraftPayloadSchema });
export type ActivityDraftPayload = z.infer<typeof activityDraftPayloadSchema>;

export const activityDraftVersionSchema = z.object({ expectedUpdatedAt: z.string().datetime() });
