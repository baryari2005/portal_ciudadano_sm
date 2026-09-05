/* eslint-disable @typescript-eslint/no-explicit-any -- Tipos intermedios del servicio Prisma legado pendientes de extracción. */
import { HorarioActividadEstado, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogConflictError, CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { createActivityScheduleSchema } from "../schemas/activity-schedule.schema";
import type { ActivityScheduleFilters, CreateActivityScheduleInput, UpdateActivityScheduleInput } from "../types/activity-schedule.types";
import { buildAuditChanges } from "@/features/audit-log/helpers/audit-log.helpers";
import { createAuditLogTx, type CreateAuditLogInput } from "@/features/audit-log/services/audit-log.server";

type ScheduleAudit = Pick<CreateAuditLogInput, "actorId" | "origin" | "requestContext">;

const include = { actividad: { select: { id:true, nombre:true } }, establecimiento: { select:{ id:true, nombre:true, direccion:true } }, profesores:{ include:{ profesor:{ include:{ usuario:{ select:{ nombre:true, apellido:true } } } } } }, recursos:{include:{recurso:{select:{id:true,nombre:true,codigo:true,capacidadUnidades:true,estado:true}}}} } satisfies Prisma.HorarioActividadInclude;
const clean = (value?: string | null) => value?.trim() || null;
const normalized = (value?: string | null) => clean(value)?.replace(/\s+/g," ").toLocaleLowerCase("es") ?? null;

function map(item: any) {
  return { id:item.id, activityId:item.actividadId, establishmentId:item.establecimientoId, day:item.diaSemana, startTime:item.horaInicio, endTime:item.horaFin, space:item.espacio, notes:item.observaciones, maxCapacity:item.cupoMaximo, waitingListEnabled:item.permiteListaEspera, overbookingEnabled:item.permiteSobrecupo, overbookingLimit:item.sobrecupoMaximo, status:item.estado, slotDurationMinutes:item.duracionTurnoMinutos, slotGapMinutes:item.intervaloTurnoMinutos, activity:{ id:item.actividad.id, name:item.actividad.nombre }, establishment:{ id:item.establecimiento.id, name:item.establecimiento.nombre, address:item.establecimiento.direccion }, professors:item.profesores.map((link:any)=>({ id:link.profesor.id, fullName:`${link.profesor.usuario.nombre} ${link.profesor.usuario.apellido}`.trim(), specialty:link.profesor.especialidad, status:link.profesor.estado, isPrimary:link.esPrincipal })), resources:item.recursos.map((link:any)=>({id:link.id,resourceId:link.recursoId,name:link.recurso.nombre,code:link.recurso.codigo,quantity:link.cantidadReservada,assignmentStrategy:link.estrategiaAsignacion,exclusive:link.exclusivo})), createdAt:item.createdAt, updatedAt:item.updatedAt };
}

async function validateRelations(tx: Prisma.TransactionClient, input: any, current?: any) {
  const activity = await tx.actividad.findUnique({ where:{ id:input.actividadId }, select:{ id:true, estado:true } });
  if (!activity) throw new CatalogValidationError("La actividad seleccionada no existe.");
  if ((!current || current.actividadId !== input.actividadId) && ["CANCELADA","FINALIZADA"].includes(activity.estado)) throw new CatalogValidationError("La actividad seleccionada no admite nuevos horarios.");
  const establishment = await tx.establecimiento.findUnique({ where:{ id:input.establecimientoId }, select:{ id:true, activo:true } });
  if (!establishment) throw new CatalogValidationError("El establecimiento seleccionado no existe.");
  if ((!current || current.establecimientoId !== input.establecimientoId) && !establishment.activo) throw new CatalogValidationError("El establecimiento seleccionado está inactivo.");
  const oldIds = new Set(current?.profesores.map((x:any)=>x.profesorId) ?? []);
  const professors = await tx.profesor.findMany({ where:{ id:{ in:input.profesoresIds } }, include:{ usuario:{ select:{ nombre:true, apellido:true } } } });
  if (professors.length !== input.profesoresIds.length) throw new CatalogValidationError("Uno o más profesores no existen.");
  const invalid = professors.find((p)=>p.estado !== "ACTIVO" && !oldIds.has(p.id));
  if (invalid) throw new CatalogValidationError(`No se puede asignar a ${invalid.usuario.nombre} ${invalid.usuario.apellido} porque no está activo.`);
  return professors;
}

async function validateConflicts(tx: Prisma.TransactionClient, input:any, excludeId?:string) {
  if (input.estado !== "ACTIVO") return;
  const rows = await tx.horarioActividad.findMany({ where:{ id:excludeId?{not:excludeId}:undefined, diaSemana:input.diaSemana, estado:"ACTIVO", horaInicio:{lt:input.horaFin}, horaFin:{gt:input.horaInicio}, OR:[{ establecimientoId:input.establecimientoId },{ profesores:{ some:{ profesorId:{ in:input.profesoresIds } } } }] }, include });
  const room = normalized(input.espacio);
  for (const row of rows) {
    const professor = row.profesores.find((link)=>input.profesoresIds.includes(link.profesorId));
    if (professor) throw new CatalogConflictError(`${professor.profesor.usuario.nombre} ${professor.profesor.usuario.apellido} ya tiene ${row.actividad.nombre}, ${row.diaSemana.toLowerCase()} de ${row.horaInicio} a ${row.horaFin}, en ${row.establecimiento.nombre}.`);
    if (room && row.establecimientoId === input.establecimientoId && normalized(row.espacio) === room) throw new CatalogConflictError(`El espacio ${input.espacio} ya está ocupado por ${row.actividad.nombre} de ${row.horaInicio} a ${row.horaFin}.`);
  }
  const resourceIds=input.recursos.map((item:any)=>item.recursoId);
  if(resourceIds.length){
    const resources=await tx.recurso.findMany({where:{id:{in:resourceIds}},select:{id:true,nombre:true,establecimientoId:true,capacidadUnidades:true,estado:true,modoReserva:true}});
    if(resources.length!==resourceIds.length)throw new CatalogValidationError("Uno o más recursos no existen.");
    for(const assignment of input.recursos){const resource=resources.find(x=>x.id===assignment.recursoId)!;if(resource.estado!=="ACTIVO")throw new CatalogValidationError(`${resource.nombre} no está disponible.`);if(resource.establecimientoId!==input.establecimientoId)throw new CatalogValidationError(`${resource.nombre} pertenece a otro establecimiento.`);if(assignment.cantidadReservada>resource.capacidadUnidades)throw new CatalogValidationError(`${resource.nombre} no tiene suficientes unidades.`);}
    const overlaps=await tx.horarioActividadRecurso.findMany({where:{recursoId:{in:resourceIds},horarioActividad:{id:excludeId?{not:excludeId}:undefined,diaSemana:input.diaSemana,estado:"ACTIVO",horaInicio:{lt:input.horaFin},horaFin:{gt:input.horaInicio}}},include:{recurso:true,horarioActividad:{include:{actividad:true}}}});
    for(const assignment of input.recursos){const resource=resources.find(x=>x.id===assignment.recursoId)!;const used=overlaps.filter(x=>x.recursoId===assignment.recursoId).reduce((sum,x)=>sum+x.cantidadReservada,0);if((assignment.exclusivo||resource.modoReserva==="EXCLUSIVO")&&used>0)throw new CatalogConflictError(`${resource.nombre} ya está reservado de forma exclusiva en ese horario.`);}
  }
}

export async function assertActivityScheduleAvailability(input: {
  establishmentId: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  espacio?: string | null;
  profesoresIds: string[];
  recursos: Array<{ recursoId: string; cantidadReservada: number; exclusivo: boolean }>;
  excludeId?: string;
}) {
  const { excludeId, ...schedule } = input;
  return prisma.$transaction((tx) => validateConflicts(tx, { ...schedule, estado: "ACTIVO" }, excludeId));
}

export async function listActivitySchedules(filters:ActivityScheduleFilters={}) {
  const search=filters.search?.trim();
  const rows=await prisma.horarioActividad.findMany({ where:{ actividadId:filters.activityId, establecimientoId:filters.establishmentId, diaSemana:filters.day, estado:filters.status as HorarioActividadEstado|undefined, profesores:filters.professorId?{some:{profesorId:filters.professorId}}:undefined, ...(search?{OR:[{espacio:{contains:search,mode:"insensitive"}},{actividad:{nombre:{contains:search,mode:"insensitive"}}},{establecimiento:{nombre:{contains:search,mode:"insensitive"}}}]}:{}) }, include, orderBy:[{diaSemana:"asc"},{horaInicio:"asc"}] });
  return rows.map(map);
}
export async function getActivitySchedule(id:string) { const row=await prisma.horarioActividad.findUnique({where:{id},include}); return row?map(row):null; }

export async function createActivitySchedule(raw:CreateActivityScheduleInput, audit?:ScheduleAudit) {
  const parsed=createActivityScheduleSchema.parse(raw); const input={...parsed, espacio:clean(parsed.espacio), observaciones:clean(parsed.observaciones), sobrecupoMaximo:parsed.permiteSobrecupo?parsed.sobrecupoMaximo:null};
  return prisma.$transaction(async tx=>{ await validateRelations(tx,input); await validateConflicts(tx,input); const row=await tx.horarioActividad.create({data:{actividadId:input.actividadId,establecimientoId:input.establecimientoId,diaSemana:input.diaSemana,horaInicio:input.horaInicio,horaFin:input.horaFin,espacio:input.espacio,observaciones:input.observaciones,cupoMaximo:input.cupoMaximo,permiteListaEspera:input.permiteListaEspera,permiteSobrecupo:input.permiteSobrecupo,sobrecupoMaximo:input.sobrecupoMaximo,estado:input.estado,duracionTurnoMinutos:input.duracionTurnoMinutos,intervaloTurnoMinutos:input.intervaloTurnoMinutos,profesores:{create:input.profesoresIds.map(id=>({profesorId:id,esPrincipal:id===input.profesorPrincipalId}))},recursos:{create:input.recursos.map(item=>({recursoId:item.recursoId,cantidadReservada:item.cantidadReservada,estrategiaAsignacion:item.estrategiaAsignacion,exclusivo:item.exclusivo}))}},include});if(audit)await createAuditLogTx(tx,{...audit,action:"CREAR",entityType:"HORARIO_ACTIVIDAD",entityId:row.id,entityName:`${row.actividad.nombre} · ${row.diaSemana} ${row.horaInicio}`});return map(row); });
}
export async function updateActivitySchedule(id:string, patch:UpdateActivityScheduleInput, audit?:ScheduleAudit) {
  return prisma.$transaction(async tx=>{ const current=await tx.horarioActividad.findUnique({where:{id},include}); if(!current) throw new CatalogNotFoundError("Horario no encontrado."); const final=createActivityScheduleSchema.parse({actividadId:current.actividadId,establecimientoId:current.establecimientoId,diaSemana:current.diaSemana,horaInicio:current.horaInicio,horaFin:current.horaFin,espacio:current.espacio,observaciones:current.observaciones,cupoMaximo:current.cupoMaximo,permiteListaEspera:current.permiteListaEspera,permiteSobrecupo:current.permiteSobrecupo,sobrecupoMaximo:current.sobrecupoMaximo,estado:current.estado,profesoresIds:current.profesores.map(x=>x.profesorId),profesorPrincipalId:current.profesores.find(x=>x.esPrincipal)?.profesorId??null,duracionTurnoMinutos:current.duracionTurnoMinutos,intervaloTurnoMinutos:current.intervaloTurnoMinutos,recursos:current.recursos.map(x=>({recursoId:x.recursoId,cantidadReservada:x.cantidadReservada,estrategiaAsignacion:x.estrategiaAsignacion,exclusivo:x.exclusivo})),...patch}); const input={...final,espacio:clean(final.espacio),observaciones:clean(final.observaciones),sobrecupoMaximo:final.permiteSobrecupo?final.sobrecupoMaximo:null}; await validateRelations(tx,input,current); await validateConflicts(tx,input,id); if(patch.profesoresIds!==undefined)await tx.horarioActividadProfesor.deleteMany({where:{horarioActividadId:id}}); if(patch.recursos!==undefined)await tx.horarioActividadRecurso.deleteMany({where:{horarioActividadId:id}}); const row=await tx.horarioActividad.update({where:{id},data:{actividadId:input.actividadId,establecimientoId:input.establecimientoId,diaSemana:input.diaSemana,horaInicio:input.horaInicio,horaFin:input.horaFin,espacio:input.espacio,observaciones:input.observaciones,cupoMaximo:input.cupoMaximo,permiteListaEspera:input.permiteListaEspera,permiteSobrecupo:input.permiteSobrecupo,sobrecupoMaximo:input.sobrecupoMaximo,estado:input.estado,duracionTurnoMinutos:input.duracionTurnoMinutos,intervaloTurnoMinutos:input.intervaloTurnoMinutos,...(patch.profesoresIds!==undefined?{profesores:{create:input.profesoresIds.map(pid=>({profesorId:pid,esPrincipal:pid===input.profesorPrincipalId}))}}:{}),...(patch.recursos!==undefined?{recursos:{create:input.recursos.map(item=>({recursoId:item.recursoId,cantidadReservada:item.cantidadReservada,estrategiaAsignacion:item.estrategiaAsignacion,exclusivo:item.exclusivo}))}}:{})},include});if(audit){const before=map(current),after=map(row),action=patch.estado==="CANCELADO"?"CANCELAR":patch.estado==="SUSPENDIDO"?"SUSPENDER":patch.estado==="FINALIZADO"?"FINALIZAR":patch.estado==="ACTIVO"&&current.estado!=="ACTIVO"?"REACTIVAR":"EDITAR";await createAuditLogTx(tx,{...audit,action,entityType:"HORARIO_ACTIVIDAD",entityId:id,entityName:`${row.actividad.nombre} · ${row.diaSemana} ${row.horaInicio}`,changes:buildAuditChanges(before,after,["activityId","establishmentId","day","startTime","endTime","space","notes","maxCapacity","waitingListEnabled","overbookingEnabled","overbookingLimit","status","professors","resources"])});}return map(row); });
}
export const changeActivityScheduleStatus=(id:string,estado:HorarioActividadEstado,audit?:ScheduleAudit)=>updateActivitySchedule(id,{estado},audit);
