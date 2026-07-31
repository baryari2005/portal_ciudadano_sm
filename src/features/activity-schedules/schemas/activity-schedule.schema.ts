import { z } from "zod";

export const WEEK_DAYS = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"] as const;
export const SCHEDULE_STATUSES = ["ACTIVO", "SUSPENDIDO", "CANCELADO", "FINALIZADO"] as const;
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usá el formato HH:mm");

const base = z.object({
  actividadId: z.string().min(1, "Seleccioná una actividad"),
  establecimientoId: z.string().min(1, "Seleccioná un establecimiento"),
  diaSemana: z.enum(WEEK_DAYS),
  horaInicio: time,
  horaFin: time,
  espacio: z.string().trim().max(120).nullable().optional(),
  observaciones: z.string().trim().max(1000).nullable().optional(),
  cupoMaximo: z.coerce.number().int().positive("Debe ser mayor que cero"),
  permiteListaEspera: z.boolean().default(true),
  permiteSobrecupo: z.boolean().default(false),
  sobrecupoMaximo: z.coerce.number().int().positive().nullable().optional(),
  estado: z.enum(SCHEDULE_STATUSES).default("ACTIVO"),
  profesoresIds: z.array(z.string().uuid()).default([]),
  profesorPrincipalId: z.string().uuid().nullable().optional(),
  duracionTurnoMinutos: z.coerce.number().int().min(15).max(720).nullable().optional(),
  intervaloTurnoMinutos: z.coerce.number().int().min(0).max(180).default(0),
  recursos: z.array(z.object({ recursoId: z.string().min(1), cantidadReservada: z.coerce.number().int().min(1), estrategiaAsignacion: z.enum(["AUTOMATICA", "ELEGIDA_USUARIO", "AL_INGRESAR"]), exclusivo: z.boolean().default(false) })).default([]),
});

function coherent(value: z.infer<typeof base>, context: z.RefinementCtx) {
  if (value.horaInicio >= value.horaFin) context.addIssue({ code: "custom", path: ["horaFin"], message: "La hora final debe ser posterior a la inicial" });
  if (new Set(value.profesoresIds).size !== value.profesoresIds.length) context.addIssue({ code: "custom", path: ["profesoresIds"], message: "No repitas profesores" });
  if (value.profesorPrincipalId && !value.profesoresIds.includes(value.profesorPrincipalId)) context.addIssue({ code: "custom", path: ["profesorPrincipalId"], message: "El responsable principal debe estar seleccionado" });
  if (value.permiteSobrecupo && !value.sobrecupoMaximo) context.addIssue({ code: "custom", path: ["sobrecupoMaximo"], message: "Indicá el sobrecupo máximo" });
  if (new Set(value.recursos.map((item) => item.recursoId)).size !== value.recursos.length) context.addIssue({ code: "custom", path: ["recursos"], message: "No repitas recursos" });
}

export const createActivityScheduleSchema = base.superRefine(coherent);
export const updateActivityScheduleSchema = z
  .object({})
  .passthrough()
  .refine((value) => Object.keys(value).length > 0, "No se informaron cambios")
  .pipe(base.partial());
export const activityScheduleStatusSchema = z.object({ estado: z.enum(SCHEDULE_STATUSES) });
