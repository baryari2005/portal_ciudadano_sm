import { z } from "zod";
import { activityRequirementsSchema } from "@/features/requirements/schemas/requirement.schema";

export const ACTIVIDAD_NIVELES = ["INICIAL", "INTERMEDIO", "AVANZADO"] as const;
export const MODALIDADES_INSCRIPCION = ["PERMANENTE", "POR_PERIODO", "POR_CLASE"] as const;
export const ACTIVIDAD_MODALIDADES = ["HORARIO_FIJO", "TURNO_RECURRENTE", "TURNO_PUNTUAL", "ACCESO_LIBRE", "EVENTO_UNICO", "CURSO_PERIODO"] as const;
export const VIGENCIAS_RESERVA = ["INDEFINIDA", "MENSUAL", "PERIODO_DEFINIDO", "UNICA"] as const;
export const ACTIVIDAD_ESTADOS = [
  "BORRADOR",
  "ACTIVA",
  "SUSPENDIDA",
  "BLOQUEADA",
  "FINALIZADA",
  "CANCELADA",
] as const;
export const ACTIVIDAD_ESTADOS_COMPATIBLES = [
  ...ACTIVIDAD_ESTADOS,
  "SIN_CUPO",
  "INACTIVA",
  "COMPLETA",
] as const;

const nullableText = (maximum?: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : value),
    maximum
      ? z
          .string()
          .max(maximum, `No puede superar los ${maximum} caracteres`)
          .nullable()
          .optional()
      : z.string().nullable().optional(),
  );

const optionalAge = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce
    .number()
    .int("La edad debe ser un número entero")
    .min(0, "La edad no puede ser negativa")
    .nullable()
    .optional(),
);

const imageUrlSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() || null : value),
  z
    .string()
    .refine((value) => {
      if (/^\/(?!\/)[^\s<>\\]*$/.test(value)) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Ingresá una URL http/https o una ruta interna válida")
    .nullable()
    .optional(),
);

const colorSchema = z.preprocess(
  (value) =>
    typeof value === "string" ? value.trim().toUpperCase() || null : value,
  z
    .string()
    .regex(/^#[0-9A-F]{6}$/, "El color debe tener formato #RRGGBB")
    .nullable()
    .optional(),
);

const priceSchema = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
    return typeof value === "string" ? value.trim() : value;
  },
  z
    .string()
    .regex(
      /^\d+(?:\.\d{1,2})?$/,
      "El precio debe ser un importe válido con hasta dos decimales",
    )
    .nullable()
    .optional(),
);

const generalFields = {
  descripcionCorta: nullableText(180),
  descripcion: nullableText(),
  imagenUrl: imageUrlSchema,
  color: colorSchema,
  nivel: z.enum(ACTIVIDAD_NIVELES).nullable().optional(),
  edadMinima: optionalAge,
  edadMaxima: optionalAge,
  requiereCertificadoMedico: z.boolean().default(false),
  requiereAutorizacion: z.boolean().default(false),
  esGratuita: z.boolean().default(true),
  precio: priceSchema.default(null),
  modalidadInscripcion: z.enum(MODALIDADES_INSCRIPCION).default("PERMANENTE"),
  duracionPeriodoMeses: z.preprocess((value) => value === "" || value === null ? null : value, z.coerce.number().int().min(1).max(24).nullable().optional()),
  horasCancelacionJustificada: z.coerce.number().int().min(0).max(168).default(24),
  modalidadOperacion: z.enum(ACTIVIDAD_MODALIDADES).default("HORARIO_FIJO"),
  vigenciaReserva: z.enum(VIGENCIAS_RESERVA).default("INDEFINIDA"),
  duracionTurnoMinutos: z.preprocess((value) => value === "" || value === null ? null : value, z.coerce.number().int().min(15).max(720).nullable().optional()),
  intervaloTurnoMinutos: z.coerce.number().int().min(0).max(180).default(0),
  anticipacionReservaDias: z.coerce.number().int().min(0).max(365).default(30),
  limiteReservasPorUsuario: z.preprocess((value) => value === "" || value === null ? null : value, z.coerce.number().int().min(1).max(100).nullable().optional()),
  requiereReserva: z.boolean().default(true),
};

type GeneralState = {
  edadMinima?: number | null;
  edadMaxima?: number | null;
  esGratuita: boolean;
  precio?: string | null;
  modalidadInscripcion?: (typeof MODALIDADES_INSCRIPCION)[number];
  duracionPeriodoMeses?: number | null;
  modalidadOperacion?: (typeof ACTIVIDAD_MODALIDADES)[number];
  duracionTurnoMinutos?: number | null;
};

function validateGeneralState(value: GeneralState, context: z.RefinementCtx) {
  if (
    value.edadMinima != null &&
    value.edadMaxima != null &&
    value.edadMinima > value.edadMaxima
  ) {
    context.addIssue({
      code: "custom",
      path: ["edadMaxima"],
      message: "La edad máxima debe ser mayor o igual a la edad mínima",
    });
  }

  if (!value.esGratuita) {
    if (value.precio == null) {
      context.addIssue({
        code: "custom",
        path: ["precio"],
        message: "El precio es obligatorio para una actividad paga",
      });
    } else if (Number(value.precio) <= 0) {
      context.addIssue({
        code: "custom",
        path: ["precio"],
        message: "El precio de una actividad paga debe ser mayor que cero",
      });
    }
  }
  if (value.modalidadInscripcion === "POR_PERIODO" && !value.duracionPeriodoMeses) {
    context.addIssue({ code: "custom", path: ["duracionPeriodoMeses"], message: "Indicá la duración del período" });
  }
  if (["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(value.modalidadOperacion ?? "") && !value.duracionTurnoMinutos) {
    context.addIssue({ code: "custom", path: ["duracionTurnoMinutos"], message: "Indicá la duración de cada turno" });
  }
}

export const activityGeneralStateSchema = z
  .object(generalFields)
  .superRefine(validateGeneralState);

export const horarioActividadSchema = z
  .object({
    id: z.string().optional(),
    diaSemana: z.string().min(1, "El día es obligatorio"),
    horaInicio: z.string().min(1, "La hora de inicio es obligatoria"),
    horaFin: z.string().min(1, "La hora de fin es obligatoria"),
  })
  .refine((value) => value.horaInicio < value.horaFin, {
    message: "La hora de inicio debe ser menor que la hora de fin",
    path: ["horaFin"],
  });

export const actividadUsuarioSchema = z.object({
  id: z.string().optional(),
  usuarioId: z.string().min(1, "El usuario es obligatorio"),
  funcion: nullableText(),
  activo: z.boolean().default(true),
});

const catalogIdSchema = z
  .string()
  .uuid("El identificador debe ser un UUID válido");
const publicosObjetivoIdsSchema = z
  .array(catalogIdSchema)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Los públicos objetivo no pueden repetirse",
  });

export const actividadSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    ...generalFields,
    establecimientoId: z.string().min(1, "El establecimiento es obligatorio"),
    cupo: z.coerce.number().int().min(0).optional().nullable(),
    estado: z.enum(ACTIVIDAD_ESTADOS_COMPATIBLES).optional(),
    estadoTexto: z.string().trim().optional(),
    categoriaActividadId: catalogIdSchema.optional().nullable(),
    publicosObjetivoIds: publicosObjetivoIdsSchema,
    requirements: activityRequirementsSchema.default([]),
    horarios: z.array(horarioActividadSchema).default([]),
    asignados: z.array(actividadUsuarioSchema).default([]),
  })
  .superRefine(validateGeneralState);

export const updateActividadSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    descripcionCorta: nullableText(180),
    descripcion: nullableText(),
    imagenUrl: imageUrlSchema,
    color: colorSchema,
    nivel: z.enum(ACTIVIDAD_NIVELES).nullable().optional(),
    requiereCertificadoMedico: z.boolean().optional(),
    requiereAutorizacion: z.boolean().optional(),
    esGratuita: z.boolean().optional(),
    precio: priceSchema,
    modalidadInscripcion: z.enum(MODALIDADES_INSCRIPCION).optional(),
    duracionPeriodoMeses: z.preprocess((value) => value === "" || value === null ? null : value, z.coerce.number().int().min(1).max(24).nullable().optional()),
    horasCancelacionJustificada: z.coerce.number().int().min(0).max(168).optional(),
    modalidadOperacion: z.enum(ACTIVIDAD_MODALIDADES).optional(),
    vigenciaReserva: z.enum(VIGENCIAS_RESERVA).optional(),
    duracionTurnoMinutos: z.preprocess((value) => value === "" || value === null ? null : value, z.coerce.number().int().min(15).max(720).nullable().optional()),
    intervaloTurnoMinutos: z.coerce.number().int().min(0).max(180).optional(),
    anticipacionReservaDias: z.coerce.number().int().min(0).max(365).optional(),
    limiteReservasPorUsuario: z.preprocess((value) => value === "" || value === null ? null : value, z.coerce.number().int().min(1).max(100).nullable().optional()),
    requiereReserva: z.boolean().optional(),
    establecimientoId: z
      .string()
      .min(1, "El establecimiento es obligatorio")
      .optional(),
    cupo: z.coerce.number().int().min(0).optional().nullable(),
    estadoTexto: z.string().trim().optional(),
    estado: z.enum(ACTIVIDAD_ESTADOS_COMPATIBLES).optional(),
    categoriaActividadId: catalogIdSchema.optional().nullable(),
    publicosObjetivoIds: publicosObjetivoIdsSchema.optional(),
    requirements: activityRequirementsSchema.optional(),
    horarios: z.array(horarioActividadSchema).optional(),
    asignados: z.array(actividadUsuarioSchema).optional(),
  })
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    {
      message: "El PATCH debe incluir al menos un campo",
    },
  );

export type ActividadNivel = (typeof ACTIVIDAD_NIVELES)[number];
export type ModalidadInscripcion = (typeof MODALIDADES_INSCRIPCION)[number];
export type ActividadModalidad = (typeof ACTIVIDAD_MODALIDADES)[number];
export type VigenciaReserva = (typeof VIGENCIAS_RESERVA)[number];
export type ActividadEstado = (typeof ACTIVIDAD_ESTADOS_COMPATIBLES)[number];
export type ActividadInput = z.infer<typeof actividadSchema>;
export type UpdateActividadInput = z.infer<typeof updateActividadSchema>;
