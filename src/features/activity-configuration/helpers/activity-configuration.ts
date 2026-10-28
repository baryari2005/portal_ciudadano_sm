import { z } from "zod";

const assignmentSchema = z.object({ startTime: z.string(), endTime: z.string(), professorIds: z.array(z.string()) });
export const activityConfigurationSchema = z.object({
  version: z.literal(1),
  startDate: z.string().date(),
  endDate: z.string().date().nullable(),
  excludedDates: z.array(z.string().date()),
  schedules: z.array(z.object({
    id: z.string().optional(), establecimientoId: z.string(), diaSemana: z.string(), horaInicio: z.string(), horaFin: z.string(),
    teacherAssignments: z.array(assignmentSchema),
  })),
}).refine(value => !value.endDate || value.endDate >= value.startDate, "La fecha final debe ser posterior o igual a la inicial.");
export type ActivityConfiguration = z.infer<typeof activityConfigurationSchema>;
export type PublishedConfigurationRow = { payload: unknown; publicadoAt: Date | null };
export function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export type StoredScheduleIdentity = {id:string;establecimientoId:string;diaSemana:string;horaInicio:string;horaFin:string;espacio?:string|null};
export function publishedConfiguration(row: PublishedConfigurationRow | null | undefined, storedSchedules: StoredScheduleIdentity[] = []): ActivityConfiguration | null {
  if (!row) return null;
  const payload = jsonObject(row.payload);
  if ("__activity" in payload) {
    const parsed = activityConfigurationSchema.safeParse(payload.__activity);
    // Never fall back to an editable payload when the published document is invalid.
    return parsed.success ? parsed.data : null;
  }
  if (!row.publicadoAt || !Object.hasOwn(payload, "generacionClasesHasta")) return null;
  const schedules=Array.isArray(payload.schedules)?payload.schedules.map(value=>{
    const schedule=jsonObject(value);
    if(schedule.establecimientoId)return schedule;
    // Older published payloads omitted the venue. Bind only to one existing matching schedule.
    const matches=storedSchedules.filter(row=>schedule.id?row.id===schedule.id:row.diaSemana===schedule.diaSemana&&row.horaInicio===schedule.horaInicio&&row.horaFin===schedule.horaFin&&(!schedule.espacio||schedule.espacio===row.espacio));
    return matches.length===1?{...schedule,id:matches[0].id,establecimientoId:matches[0].establecimientoId}:schedule;
  }):[];
  const parsed = activityConfigurationSchema.safeParse({version:1,startDate:payload.generacionClasesDesde,endDate:payload.generacionClasesHasta,excludedDates:payload.fechasExcluidas ?? [],schedules});
  return parsed.success ? parsed.data : null;
}
export function withConfiguration(payload: unknown, configuration: ActivityConfiguration | null) {
  const object = {...jsonObject(payload)};
  delete object.__activity;
  return configuration ? {...object, __activity: configuration} : object;
}
export function configurationDates(configuration: ActivityConfiguration | null) {
  return {
    vigenciaConfirmada: !!configuration,
    fechaInicio: configuration ? new Date(`${configuration.startDate}T00:00:00Z`) : null,
    fechaFin: configuration?.endDate ? new Date(`${configuration.endDate}T00:00:00Z`) : null,
    fechasExcluidas: configuration?.excludedDates ?? [],
  };
}
export function scheduleAssignments(configuration: ActivityConfiguration | null, schedule: {id:string;establecimientoId:string;diaSemana:string;horaInicio:string;horaFin:string}) {
  return configuration?.schedules.find(item => item.id === schedule.id || (!item.id && item.establecimientoId === schedule.establecimientoId && item.diaSemana === schedule.diaSemana && item.horaInicio === schedule.horaInicio && item.horaFin === schedule.horaFin))?.teacherAssignments;
}
