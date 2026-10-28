import { inTransaction, type DatabaseClient } from "@/lib/prisma-transaction";
import { readActivityConfiguration, withActivityValidity, writeActivityConfiguration } from "@/features/activity-configuration/services/activity-configuration.server";
import { publishedConfiguration, withConfiguration, scheduleAssignments } from "@/features/activity-configuration/helpers/activity-configuration";
/* eslint-disable @typescript-eslint/no-explicit-any -- Normalización diferencial entre borradores y relaciones Prisma legadas. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actividadSchema } from "@/features/actividades/schemas/actividad.schema";
import { createActividad, getActividad, patchActividad } from "@/features/actividades/services/actividades.server";
import { assertActivityScheduleAvailability, createActivitySchedule, updateActivitySchedule } from "@/features/activity-schedules/services/activity-schedules.server";
import { syncGeneratedSessionTeachers } from "@/features/activity-sessions/services/activity-sessions.server";
import { CatalogConflictError, CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { activityDraftPayloadSchema, type ActivityDraftPayload } from "../schemas/activity-draft.schema";
import { notifyTeacherAssignmentChanges } from "@/features/teacher/services/teacher-assignment-notifications.server";
import { effectiveTeacherAssignments } from "../helpers/teacher-slot-assignments";

import { draftFingerprint, draftHasChanges, readDraftMetadata, nextDraftTimestamp } from "../helpers/draft-persistence";

const draftEditor = { creadoPor: { select: { nombre: true, apellido: true } } } as const;
const conflictMessage = "El borrador cambió en otra sesión. Recargá la edición antes de continuar; tus cambios locales no se sobrescribieron.";

export const emptyActivityDraftPayload: ActivityDraftPayload = activityDraftPayloadSchema.parse({});

export function activityDraftPending(payload: ActivityDraftPayload) {
  const pending: Array<{ step: number; key: string; label: string }> = [];
  if (!payload.modalidadOperacion) pending.push({ step: 1, key: "modalidad", label: "Elegir una modalidad" });
  if (!payload.nombre.trim()) pending.push({ step: 2, key: "nombre", label: "Indicar el nombre de la actividad" });
  if (!payload.categoriaActividadId) pending.push({ step: 2, key: "categoria", label: "Seleccionar una categoría" });
  if (!payload.schedules.length) pending.push({ step: 3, key: "horarios", label: "Configurar al menos un horario" });
  if (payload.schedules.some((schedule) => !schedule.establecimientoId)) pending.push({ step: 3, key: "establecimiento-horario", label: "Asignar una sede a cada horario" });
  if (payload.requiereReserva && payload.schedules.some((schedule) => !schedule.cupoMaximo || schedule.cupoMaximo < 1)) pending.push({ step: 3, key: "cupo", label: "Definir el cupo de cada horario" });
  if (hasOverlappingSchedules(payload.schedules)) pending.push({ step: 3, key: "horario-solapado", label: "Corregir horarios superpuestos en la misma sede" });
  if (hasOverlappingProfessorSchedules(payload.schedules)) pending.push({ step: 3, key: "profesor-solapado", label: "Corregir un profesor asignado a horarios superpuestos" });
  const usesTurns = ["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion ?? "");
  if (usesTurns && payload.schedules.some((schedule) => !schedule.duracionTurnoMinutos)) pending.push({ step: 3, key: "duracion", label: "Definir la duración del turno de cada horario" });
  if (!payload.generacionClasesDesde) pending.push({ step: 6, key: "generacion", label: "Indicar la fecha de inicio de la actividad" });
  if (payload.generacionClasesDesde && payload.generacionClasesHasta && payload.generacionClasesDesde > payload.generacionClasesHasta) pending.push({ step: 6, key: "generacion-rango", label: "Corregir el período inicial de clases" });
  if (payload.modalidadOperacion === "EVENTO_UNICO" && payload.generacionClasesDesde !== payload.generacionClasesHasta) pending.push({ step: 6, key: "evento-fecha", label: "El evento único debe generarse en una sola fecha" });
  return pending;
}

function hasOverlappingSchedules(schedules: ActivityDraftPayload["schedules"]) {
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];
      if (a.diaSemana !== b.diaSemana || a.establecimientoId !== b.establecimientoId) continue;
      if (a.horaInicio < b.horaFin && b.horaInicio < a.horaFin) return true;
    }
  }
  return false;
}

// Un mismo profesor no puede dictar dos horarios superpuestos de la misma
// actividad aunque sean en sedes distintas, así que este chequeo ignora la sede.
function hasOverlappingProfessorSchedules(schedules: ActivityDraftPayload["schedules"]) {
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];
      if (a.diaSemana !== b.diaSemana) continue;
      if (a.horaInicio >= b.horaFin || b.horaInicio >= a.horaFin) continue;
      if (a.profesorIds.some((profesorId) => b.profesorIds.includes(profesorId))) return true;
    }
  }
  return false;
}

// Compatibilidad con borradores guardados antes de que la sede pasara de ser
// un único campo de la actividad a un campo por horario (establecimientoId -> establecimientoIds).
function migrateLegacyDraftPayload(raw: any): any {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const legacyEstablecimientoId = typeof raw.establecimientoId === "string" ? raw.establecimientoId : null;
  const establecimientoIds = Array.isArray(raw.establecimientoIds)
    ? raw.establecimientoIds
    : legacyEstablecimientoId
      ? [legacyEstablecimientoId]
      : [];
  const schedules = Array.isArray(raw.schedules)
    ? raw.schedules.map((item: any) => ({
        ...item,
        establecimientoId: item?.establecimientoId || legacyEstablecimientoId || establecimientoIds[0] || "",
      }))
    : raw.schedules;
  return { ...raw, establecimientoIds, schedules };
}

function map(row: any) {
  const payload = activityDraftPayloadSchema.parse(migrateLegacyDraftPayload(row.payload));
  const pending = activityDraftPending(payload);
  return { id: row.id, activityId: row.actividadId, name: row.nombre, modality: row.modalidad, currentStep: row.pasoActual, status: row.estado === "PUBLICANDO" ? "PUBLICANDO" : pending.length ? "INCOMPLETO" : "COMPLETO", hasChanges: draftHasChanges(payload, readDraftMetadata(row.payload)), lastEditedBy: row.creadoPor ? [row.creadoPor.nombre, row.creadoPor.apellido].filter(Boolean).join(" ") : null, payload, pending, completion: Math.round(((4 - new Set(pending.map((item) => item.step)).size) / 4) * 100), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function createActivityDraft(userId: string) { return map(await prisma.actividadBorrador.create({ data: { creadoPorId: userId, payload: { ...emptyActivityDraftPayload, __draft: { baseline: draftFingerprint(emptyActivityDraftPayload) } } as unknown as Prisma.InputJsonValue, estado: "SIN_CAMBIOS" }, include: draftEditor })); }
export async function createActivityEditDraft(activityId: string, userId: string) {
  const activityRecord = await prisma.actividad.findUnique({
    where: { id: activityId },
    include: {
      publicosObjetivo: true,
      requisitos: true,
      horarios: {
        where: { estado: { in: ["ACTIVO", "SUSPENDIDO"] } },
        include: { profesores: true, recursos: true, clases: { where: { estado: { not: "CANCELADA" } }, select: { fecha: true, horaInicio: true, horaFin: true, profesores: { select: { profesorId: true } } }, orderBy: { fecha: "asc" } } },
        orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
      },
    },
  });
  if (!activityRecord) throw new CatalogNotFoundError("Actividad no encontrada.");
  const configuration=await readActivityConfiguration(prisma,activityId);
  const activity=await withActivityValidity(prisma,activityRecord);
  const payload = activityDraftPayloadSchema.parse({
    modalidadOperacion: activity.modalidadOperacion,
    nombre: activity.nombre,
    descripcionCorta: activity.descripcionCorta,
    descripcion: activity.descripcion,
    imagenUrl: activity.imagenUrl,
    color: activity.color,
    categoriaActividadId: activity.categoriaActividadId,
    nivel: activity.nivel,
    edadMinima: activity.edadMinima,
    edadMaxima: activity.edadMaxima,
    esGratuita: activity.esGratuita,
    precio: activity.precio?.toFixed(2) ?? null,
    establecimientoIds: [...new Set(activity.horarios.map((schedule) => schedule.establecimientoId))],
    cupo: activity.cupo,
    publicosObjetivoIds: activity.publicosObjetivo.map((item) => item.publicoObjetivoId),
    requirements: activity.requisitos.map((item) => ({ requisitoId: item.requisitoId, obligatorio: item.obligatorio, observaciones: item.observaciones, orden: item.orden })),
    modalidadInscripcion: activity.modalidadInscripcion,
    vigenciaReserva: activity.vigenciaReserva,
    duracionPeriodoMeses: activity.duracionPeriodoMeses,
    duracionTurnoMinutos: activity.duracionTurnoMinutos,
    intervaloTurnoMinutos: activity.intervaloTurnoMinutos,
    anticipacionReservaDias: activity.anticipacionReservaDias,
    limiteReservasPorUsuario: activity.limiteReservasPorUsuario,
    requiereReserva: activity.requiereReserva,
    horasCancelacionJustificada: activity.horasCancelacionJustificada,
    generacionClasesDesde: activity.fechaInicio?.toISOString().slice(0, 10) ?? null,
    generacionClasesHasta: activity.fechaFin?.toISOString().slice(0, 10) ?? null,
    fechasExcluidas: activity.fechasExcluidas,
    schedules: activity.horarios.map((schedule) => ({ id: schedule.id, establecimientoId: schedule.establecimientoId, diaSemana: schedule.diaSemana, horaInicio: schedule.horaInicio, horaFin: schedule.horaFin, espacio: schedule.espacio, cupoMaximo: schedule.cupoMaximo, duracionTurnoMinutos: schedule.duracionTurnoMinutos ?? activity.duracionTurnoMinutos, intervaloTurnoMinutos: schedule.duracionTurnoMinutos ? schedule.intervaloTurnoMinutos : activity.intervaloTurnoMinutos, profesorIds: schedule.profesores.map((item) => item.profesorId), recursoIds: schedule.recursos.map((item) => item.recursoId), teacherAssignments: scheduleAssignments(configuration,schedule) ?? [] })),
  });
  const existing = await prisma.actividadBorrador.findUnique({ where: { actividadId: activityId }, include: draftEditor });
  if (existing && existing.publicadoAt === null) {
    if (existing.estado === "PUBLICANDO") throw new CatalogConflictError("La actividad se está guardando en otra sesión. Intentá nuevamente en unos segundos.");
    const metadata = readDraftMetadata(existing.payload);
    if (existing.estado !== "SIN_CAMBIOS" || (metadata?.baseline === draftFingerprint(payload) && metadata.activityUpdatedAt === activity.updatedAt.toISOString())) return map(existing);
  }
  const data = { creadoPorId: userId, nombre: activity.nombre, modalidad: activity.modalidadOperacion, pasoActual: 1, payload: withConfiguration({ ...payload, __draft: { baseline: draftFingerprint(payload), activityUpdatedAt: activity.updatedAt.toISOString() } },configuration) as unknown as Prisma.InputJsonValue, estado: "SIN_CAMBIOS", publicadoAt: null, updatedAt: existing ? nextDraftTimestamp(existing.updatedAt) : new Date() };
  if (!existing) return map(await prisma.actividadBorrador.create({ data: { ...data, actividadId: activityId }, include: draftEditor }));
  const refreshed = await prisma.actividadBorrador.updateMany({ where: { id: existing.id, updatedAt: existing.updatedAt }, data });
  if (!refreshed.count) throw new CatalogConflictError(conflictMessage);
  return map(await prisma.actividadBorrador.findUniqueOrThrow({ where: { id: existing.id }, include: draftEditor }));
}
export async function listActivityDrafts() {
  return (await prisma.actividadBorrador.findMany({ where: { publicadoAt: null, estado: { not: "SIN_CAMBIOS" } }, include: draftEditor, orderBy: { updatedAt: "desc" } })).map(map);
}
export async function getActivityDraft(id: string, db: DatabaseClient = prisma) {
  const row = await db.actividadBorrador.findUnique({ where: { id }, include: draftEditor });
  return row && !row.publicadoAt ? map(row) : null;
}
export async function saveActivityDraft(id: string, userId: string, payload: ActivityDraftPayload, expectedUpdatedAt: string, currentStep?: number) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "ActividadBorrador" WHERE id = ${id} FOR UPDATE`;
    const existing = await tx.actividadBorrador.findUnique({ where: { id } });
    if (!existing) throw new CatalogNotFoundError("Borrador no encontrado.");
    if (existing.publicadoAt || existing.estado === "PUBLICANDO" || existing.updatedAt.toISOString() !== expectedUpdatedAt) throw new CatalogConflictError(conflictMessage);
    const metadata = readDraftMetadata(existing.payload);
    const changed = draftHasChanges(payload, metadata);
    const pending = activityDraftPending(payload);
    const result = await tx.actividadBorrador.updateMany({
      where: { id, updatedAt: new Date(expectedUpdatedAt), publicadoAt: null, estado: { not: "PUBLICANDO" } },
      data: {
        creadoPorId: userId, nombre: payload.nombre.trim() || "Actividad sin nombre", modalidad: payload.modalidadOperacion,
        pasoActual: currentStep ?? existing.pasoActual,
        payload: withConfiguration({ ...payload, ...(metadata ? { __draft: metadata } : {}) },publishedConfiguration(existing)) as unknown as Prisma.InputJsonValue,
        estado: changed ? pending.length ? "INCOMPLETO" : "COMPLETO" : "SIN_CAMBIOS",
        updatedAt: nextDraftTimestamp(existing.updatedAt),
      },
    });
    if (!result.count) throw new CatalogConflictError(conflictMessage);
    return map(await tx.actividadBorrador.findUniqueOrThrow({ where: { id }, include: draftEditor }));
  });
}
export async function deleteActivityDraft(id: string, expectedUpdatedAt: string) {
  return prisma.$transaction(async tx=>{
    const row=await tx.actividadBorrador.findUnique({where:{id}});
    const configuration=publishedConfiguration(row);
    const where={id,updatedAt:new Date(expectedUpdatedAt),publicadoAt:null,estado:{not:"PUBLICANDO"}};
    const result=configuration&&row?.actividadId
      ? await tx.actividadBorrador.updateMany({where,data:{estado:"PUBLICADO",publicadoAt:new Date(),payload:withConfiguration({},configuration) as unknown as Prisma.InputJsonValue}})
      : await tx.actividadBorrador.deleteMany({where});
    if(!result.count)throw new CatalogConflictError(conflictMessage);
  });
}

export async function publishActivityDraft(id: string, userId: string, expectedUpdatedAt: string) {
  const row = await prisma.actividadBorrador.findUnique({ where: { id } });
  if (!row || row.publicadoAt || row.estado === "PUBLICANDO" || row.updatedAt.toISOString() !== expectedUpdatedAt) throw new CatalogConflictError(conflictMessage);
  const metadata = readDraftMetadata(row.payload);
  if (row.actividadId && metadata?.activityUpdatedAt) {
    const activity = await prisma.actividad.findUnique({ where: { id: row.actividadId }, select: { updatedAt: true } });
    if (!activity || activity.updatedAt.toISOString() !== metadata.activityUpdatedAt) throw new CatalogConflictError("La actividad publicada cambió desde que se inició este borrador. Conservamos tu copia; revisá los cambios antes de descartarla y comenzar una nueva edición.");
  }
  const claimedAt = row.updatedAt;
  const claimed = await prisma.actividadBorrador.updateMany({ where: { id, updatedAt: row.updatedAt, publicadoAt: null, estado: { not: "PUBLICANDO" } }, data: { estado: "PUBLICANDO", updatedAt: claimedAt } });
  if (!claimed.count) throw new CatalogConflictError(conflictMessage);
  try {
    return await prisma.$transaction(async tx=>{
      if(row.actividadId){
        await tx.$queryRaw`SELECT id FROM "Actividad" WHERE id = ${row.actividadId} FOR UPDATE`;
        const activity=await tx.actividad.findUnique({where:{id:row.actividadId},select:{updatedAt:true}});
        if(metadata?.activityUpdatedAt&&activity?.updatedAt.toISOString()!==metadata.activityUpdatedAt)throw new CatalogConflictError("La actividad publicada cambió desde que se inició este borrador.");
      }
      await tx.$queryRaw`SELECT id FROM "ActividadBorrador" WHERE id = ${id} FOR UPDATE`;
      const locked=await tx.actividadBorrador.findUnique({where:{id}});
      if(!locked||locked.estado!=="PUBLICANDO"||locked.updatedAt.toISOString()!==claimedAt.toISOString())throw new CatalogConflictError(conflictMessage);
      return publishActivityDraftContents(id,userId,tx);
    },{timeout:60000});
  } catch (error) {
    const restored=await prisma.actividadBorrador.updateMany({ where: { id, estado: "PUBLICANDO", updatedAt: claimedAt }, data: { estado: row.estado, updatedAt: row.updatedAt } });
    if(!restored.count)await prisma.actividadBorrador.updateMany({where:{id,estado:"PUBLICANDO"},data:{estado:row.estado}});
    throw error;
  }
}

async function publishActivityDraftContents(id: string, userId: string, db: DatabaseClient) {
  const draft = await getActivityDraft(id,db);
  if (!draft) throw new CatalogNotFoundError("Borrador no encontrado.");
  if (draft.activityId && !draft.hasChanges) {
    const activity = await getActividad(draft.activityId,db);
    await db.actividadBorrador.update({ where: { id }, data: { publicadoAt: new Date(), estado: "PUBLICADO", creadoPorId: userId } });
    return activity;
  }
  if (draft.pending.length) throw new CatalogValidationError(`La actividad todavía está incompleta: ${draft.pending.map((item) => item.label).join(", ")}.`);
  const p = draft.payload;
  if (!p.modalidadOperacion) throw new CatalogValidationError("Elegí una modalidad para continuar.");
  if (!draft.activityId) for (const schedule of p.schedules) {
    const usesTurns=["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion);
    for(const assignment of effectiveTeacherAssignments(schedule,schedule.duracionTurnoMinutos,schedule.intervaloTurnoMinutos,usesTurns))await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:assignment.startTime,horaFin:assignment.endTime,espacio:null,profesoresIds:assignment.professorIds,recursos:[],excludeId:schedule.id},db);
    await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,espacio:schedule.espacio,profesoresIds:[],recursos:schedule.recursoIds.map((recursoId)=>({recursoId,cantidadReservada:1,exclusivo:false})),excludeId:schedule.id},db);
  }
  if (draft.activityId) {
    const currentRecord = await db.actividad.findUnique({where:{id:draft.activityId},include:{horarios:{include:{profesores:true,recursos:true,clases:{where:{estado:{not:"CANCELADA"}},orderBy:{fecha:"asc"},select:{horaInicio:true,horaFin:true,profesores:{select:{profesorId:true}}}}}},publicosObjetivo:true,requisitos:true}});
    if(!currentRecord)throw new CatalogNotFoundError("Actividad no encontrada.");
    const configuration=await readActivityConfiguration(db,draft.activityId);
    const current={...await withActivityValidity(db,currentRecord),horarios:currentRecord.horarios.map(schedule=>({...schedule,teacherAssignments:scheduleAssignments(configuration,schedule)??[]}))};
    const normalizeScheduleStructure=(items:any[])=>items.map(item=>({id:item.id??null,establecimientoId:item.establecimientoId,diaSemana:item.diaSemana,horaInicio:item.horaInicio,horaFin:item.horaFin})).sort((a,b)=>`${a.id}${a.diaSemana}${a.establecimientoId}`.localeCompare(`${b.id}${b.diaSemana}${b.establecimientoId}`));
    const normalizeSchedules=(items:any[])=>items.map(item=>({id:item.id??null,establecimientoId:item.establecimientoId,diaSemana:item.diaSemana,horaInicio:item.horaInicio,horaFin:item.horaFin,espacio:item.espacio??null,cupoMaximo:item.cupoMaximo,duracionTurnoMinutos:item.duracionTurnoMinutos??null,intervaloTurnoMinutos:item.intervaloTurnoMinutos??0,profesorIds:[...new Set<string>(item.profesorIds??item.profesores?.map((link:any)=>link.profesorId)??[])].sort(),recursoIds:[...new Set<string>(item.recursoIds??item.recursos?.map((link:any)=>link.recursoId)??[])].sort(),teacherAssignments:(item.teacherAssignments??[]).map((assignment:any)=>({...assignment,professorIds:[...assignment.professorIds].sort()})).sort((a:any,b:any)=>a.startTime.localeCompare(b.startTime))})).sort((a,b)=>`${a.id}${a.diaSemana}${a.establecimientoId}`.localeCompare(`${b.id}${b.diaSemana}${b.establecimientoId}`));
    const scheduleStructureChanged=JSON.stringify(normalizeScheduleStructure(p.schedules))!==JSON.stringify(normalizeScheduleStructure(current.horarios));
    const schedulesChanged=JSON.stringify(normalizeSchedules(p.schedules))!==JSON.stringify(normalizeSchedules(current.horarios));
    if(schedulesChanged)for(const schedule of p.schedules){const usesTurns=["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion);for(const assignment of effectiveTeacherAssignments(schedule,schedule.duracionTurnoMinutos,schedule.intervaloTurnoMinutos,usesTurns))await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:assignment.startTime,horaFin:assignment.endTime,espacio:null,profesoresIds:assignment.professorIds,recursos:[],excludeId:schedule.id},db);await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,espacio:schedule.espacio,profesoresIds:[],recursos:schedule.recursoIds.map(recursoId=>({recursoId,cantidadReservada:1,exclusivo:false})),excludeId:schedule.id},db);}
    const changes:any={};
    if(p.generacionClasesDesde !== current.fechaInicio?.toISOString().slice(0,10)) changes.fechaInicio=p.generacionClasesDesde;
    if(p.generacionClasesHasta !== (current.fechaFin?.toISOString().slice(0,10)??null)) changes.fechaFin=p.generacionClasesHasta;
    if(JSON.stringify(p.fechasExcluidas)!==JSON.stringify(current.fechasExcluidas)) changes.fechasExcluidas=p.fechasExcluidas;
    const scalarPairs:Array<[string,unknown,unknown]>= [["nombre",p.nombre,current.nombre],["descripcionCorta",p.descripcionCorta,current.descripcionCorta],["descripcion",p.descripcion,current.descripcion],["imagenUrl",p.imagenUrl,current.imagenUrl],["color",p.color,current.color],["nivel",p.nivel,current.nivel],["esGratuita",p.esGratuita,current.esGratuita],["precio",p.precio,current.precio?.toString()??null],["modalidadInscripcion",p.modalidadInscripcion,current.modalidadInscripcion],["duracionPeriodoMeses",p.duracionPeriodoMeses,current.duracionPeriodoMeses],["horasCancelacionJustificada",p.horasCancelacionJustificada,current.horasCancelacionJustificada],["modalidadOperacion",p.modalidadOperacion,current.modalidadOperacion],["vigenciaReserva",p.vigenciaReserva,current.vigenciaReserva],["duracionTurnoMinutos",p.duracionTurnoMinutos,current.duracionTurnoMinutos],["intervaloTurnoMinutos",p.intervaloTurnoMinutos,current.intervaloTurnoMinutos],["anticipacionReservaDias",p.anticipacionReservaDias,current.anticipacionReservaDias],["limiteReservasPorUsuario",p.limiteReservasPorUsuario,current.limiteReservasPorUsuario],["requiereReserva",p.requiereReserva,current.requiereReserva],["cupo",p.cupo,current.cupo],["categoriaActividadId",p.categoriaActividadId,current.categoriaActividadId]];
    for(const[key,next,previous]of scalarPairs)if(String(next??"")!==String(previous??""))changes[key]=next;
    const publics=[...p.publicosObjetivoIds].sort(),currentPublics=current.publicosObjetivo.map(item=>item.publicoObjetivoId).sort();if(JSON.stringify(publics)!==JSON.stringify(currentPublics))changes.publicosObjetivoIds=p.publicosObjetivoIds;
    const requirements=p.requirements.map(item=>({...item})).sort((a,b)=>a.requisitoId.localeCompare(b.requisitoId)),currentRequirements=current.requisitos.map(item=>({requisitoId:item.requisitoId,obligatorio:item.obligatorio,observaciones:item.observaciones,orden:item.orden})).sort((a,b)=>a.requisitoId.localeCompare(b.requisitoId));if(JSON.stringify(requirements)!==JSON.stringify(currentRequirements))changes.requirements=p.requirements;
    if(scheduleStructureChanged)changes.horarios=p.schedules.map(schedule=>({id:schedule.id,establecimientoId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin}));
    const activity=Object.keys(changes).length?await patchActividad(draft.activityId,changes,userId,db):await getActividad(draft.activityId,db);
    if(!activity)throw new CatalogNotFoundError("Actividad no encontrada.");
    if(schedulesChanged){const used=new Set<string>();for(const schedule of p.schedules){const target=schedule.id?activity.horarios.find(item=>item.id===schedule.id):activity.horarios.find(item=>!used.has(item.id!)&&item.diaSemana===schedule.diaSemana&&item.horaInicio===schedule.horaInicio&&item.horaFin===schedule.horaFin&&item.establecimientoId===schedule.establecimientoId);if(!target?.id)throw new CatalogValidationError("No pudimos vincular uno de los horarios actualizados.");used.add(target.id);const previous=current.horarios.find(item=>item.id===target.id);const updated=await updateActivitySchedule(target.id,{establecimientoId:schedule.establecimientoId,espacio:schedule.espacio,cupoMaximo:schedule.cupoMaximo,profesoresIds:schedule.profesorIds,profesorPrincipalId:schedule.profesorIds[0]??null,duracionTurnoMinutos:schedule.duracionTurnoMinutos,intervaloTurnoMinutos:schedule.intervaloTurnoMinutos,recursos:schedule.recursoIds.map(recursoId=>({recursoId,cantidadReservada:1,estrategiaAsignacion:"AL_INGRESAR",exclusivo:false}))},undefined,{ignoreProfessorConflicts:true},db);const usesTurns=["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion);await syncGeneratedSessionTeachers(target.id,effectiveTeacherAssignments(schedule,schedule.duracionTurnoMinutos,schedule.intervaloTurnoMinutos,usesTurns),db);const professorUsers=await db.profesor.findMany({where:{id:{in:updated.professors.map((item:{id:string})=>item.id)}},select:{id:true,usuarioId:true}}),userByProfessor=new Map(professorUsers.map(item=>[item.id,item.usuarioId]));await notifyTeacherAssignmentChanges(db,{previous:(previous?.profesores??[]).map(item=>({professorId:item.profesorId,isPrimary:item.esPrincipal,userId:userByProfessor.get(item.profesorId)??""})),current:updated.professors.map((item:{id:string;isPrimary:boolean})=>({professorId:item.id,isPrimary:item.isPrimary,userId:userByProfessor.get(item.id)??""})),context:{kind:"schedule",entityId:updated.id,activityName:updated.activity.name,establishmentId:updated.establishmentId,establishmentName:updated.establishment.name,space:updated.space,day:updated.day,startTime:updated.startTime,endTime:updated.endTime},senderId:userId,operationKey:`workflow:${id}:${new Date(draft.updatedAt).getTime()}`});}}
    await persistPublishedProgramming(id,draft.activityId,userId,p,activity.horarios,db);
    return await getActividad(draft.activityId,db);
  }
  const input = actividadSchema.parse({ fechaInicio: p.generacionClasesDesde, fechaFin: p.generacionClasesHasta, fechasExcluidas: p.fechasExcluidas, nombre: p.nombre, descripcionCorta: p.descripcionCorta, descripcion: p.descripcion, imagenUrl: p.imagenUrl, color: p.color, nivel: p.nivel, edadMinima: p.edadMinima, edadMaxima: p.edadMaxima, requiereCertificadoMedico: false, requiereAutorizacion: false, esGratuita: p.esGratuita, precio: p.precio, modalidadInscripcion: p.modalidadInscripcion, duracionPeriodoMeses: p.duracionPeriodoMeses, horasCancelacionJustificada: p.horasCancelacionJustificada, modalidadOperacion: p.modalidadOperacion, vigenciaReserva: p.vigenciaReserva, duracionTurnoMinutos: p.duracionTurnoMinutos, intervaloTurnoMinutos: p.intervaloTurnoMinutos, anticipacionReservaDias: p.anticipacionReservaDias, limiteReservasPorUsuario: p.limiteReservasPorUsuario, requiereReserva: p.requiereReserva, cupo: p.cupo, estado: "BORRADOR", categoriaActividadId: p.categoriaActividadId, publicosObjetivoIds: p.publicosObjetivoIds, requirements: p.requirements, horarios: [], asignados: [] });
  const activity = await createActividad(input,userId,id,db);
  const createdSchedules = [];
  try {
    for (const schedule of p.schedules) { const created=await createActivitySchedule({ actividadId: activity.id, establecimientoId: schedule.establecimientoId, diaSemana: schedule.diaSemana, horaInicio: schedule.horaInicio, horaFin: schedule.horaFin, espacio: schedule.espacio, observaciones: null, cupoMaximo: schedule.cupoMaximo, permiteListaEspera: true, permiteSobrecupo: false, sobrecupoMaximo: null, estado: "ACTIVO", profesoresIds: schedule.profesorIds, profesorPrincipalId: schedule.profesorIds[0] ?? null, duracionTurnoMinutos: schedule.duracionTurnoMinutos, intervaloTurnoMinutos: schedule.intervaloTurnoMinutos, recursos: schedule.recursoIds.map((recursoId) => ({ recursoId, cantidadReservada: 1, estrategiaAsignacion: "AL_INGRESAR", exclusivo: false })) },undefined,db);createdSchedules.push(created);const professorUsers=await db.profesor.findMany({where:{id:{in:created.professors.map((item:{id:string})=>item.id)}},select:{id:true,usuarioId:true}}),userByProfessor=new Map(professorUsers.map(item=>[item.id,item.usuarioId]));await notifyTeacherAssignmentChanges(db,{previous:[],current:created.professors.map((item:{id:string;isPrimary:boolean})=>({professorId:item.id,isPrimary:item.isPrimary,userId:userByProfessor.get(item.id)??""})),context:{kind:"schedule",entityId:created.id,activityName:created.activity.name,establishmentId:created.establishmentId,establishmentName:created.establishment.name,space:created.space,day:created.day,startTime:created.startTime,endTime:created.endTime},senderId:userId,operationKey:`workflow:${id}:${new Date(draft.updatedAt).getTime()}`}); }
  } catch (error) {
    // The enclosing publication transaction rolls back activity, configuration and schedules.
    throw error;
  }
  const activeActivity = await patchActividad(activity.id, { estado: "ACTIVA" },userId,db);
  await persistPublishedProgramming(id,activity.id,userId,p,createdSchedules.map(schedule=>({id:schedule.id,establecimientoId:schedule.establishmentId,diaSemana:schedule.day,horaInicio:schedule.startTime,horaFin:schedule.endTime})),db);
  return activeActivity;
}

async function persistPublishedProgramming(id:string,activityId:string,userId:string,p:ActivityDraftPayload,schedules:Array<{id:string;establecimientoId:string;diaSemana:string;horaInicio:string;horaFin:string}>,db: DatabaseClient){
  const used=new Set<string>();
  const templates=p.schedules.map(item=>{
    const target=schedules.find(row=>!used.has(row.id)&&(item.id===row.id||(!item.id&&row.establecimientoId===item.establecimientoId&&row.diaSemana===item.diaSemana&&row.horaInicio===item.horaInicio&&row.horaFin===item.horaFin)));
    if(!target)throw new CatalogValidationError("No pudimos vincular la programación del horario.");
    used.add(target.id);
    return {...target,teacherAssignments:effectiveTeacherAssignments(item,item.duracionTurnoMinutos,item.intervaloTurnoMinutos,["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion??""))};
  });
  await inTransaction(db,async tx=>{
    await tx.$queryRaw`SELECT id FROM "Actividad" WHERE id = ${activityId} FOR UPDATE`;
    await writeActivityConfiguration(tx,activityId,{startDate:p.generacionClasesDesde!,endDate:p.generacionClasesHasta,excludedDates:p.fechasExcluidas,schedules:templates},userId);
    await tx.actividadBorrador.update({where:{id},data:{actividadId:activityId,publicadoAt:new Date(),estado:"PUBLICADO",creadoPorId:userId}});
  });
}
