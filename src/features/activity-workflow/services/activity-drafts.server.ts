/* eslint-disable @typescript-eslint/no-explicit-any -- Normalización diferencial entre borradores y relaciones Prisma legadas. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actividadSchema } from "@/features/actividades/schemas/actividad.schema";
import { createActividad, getActividad, patchActividad, purgeActivity } from "@/features/actividades/services/actividades.server";
import { assertActivityScheduleAvailability, createActivitySchedule, updateActivitySchedule } from "@/features/activity-schedules/services/activity-schedules.server";
import { generateActivitySessionsBulk, syncGeneratedSessionTeachers } from "@/features/activity-sessions/services/activity-sessions.server";
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
  if (!payload.establecimientoIds.length) pending.push({ step: 3, key: "establecimiento", label: "Seleccionar al menos una sede" });
  if (!payload.schedules.length) pending.push({ step: 4, key: "horarios", label: "Configurar al menos un horario" });
  if (payload.schedules.some((schedule) => !schedule.establecimientoId)) pending.push({ step: 4, key: "establecimiento-horario", label: "Asignar una sede a cada horario" });
  if (payload.requiereReserva && (!payload.cupo || payload.cupo < 1)) pending.push({ step: 5, key: "cupo", label: "Definir el cupo" });
  const needsTeacher = payload.modalidadOperacion && !["ACCESO_LIBRE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion);
  const usesTurns = ["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion ?? "");
  const uncoveredTeacherSlot = payload.schedules.some((schedule) => effectiveTeacherAssignments(schedule, payload.duracionTurnoMinutos, payload.intervaloTurnoMinutos, usesTurns).some((assignment) => assignment.professorIds.length === 0));
  const scheduleWithoutTeacher = payload.schedules.some((schedule) => schedule.profesorIds.length === 0);
  const hasSelectedTeacher = payload.schedules.some((schedule) => schedule.profesorIds.length > 0);
  if (needsTeacher && (!payload.schedules.length || scheduleWithoutTeacher)) pending.push({ step: 6, key: "profesor", label: "Asignar un profesor aprobado a cada horario" });
  else if (usesTurns && hasSelectedTeacher && uncoveredTeacherSlot) pending.push({ step: 7, key: "profesor-turno", label: "Asignar al menos un profesor a cada turno" });
  if (["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion ?? "") && !payload.duracionTurnoMinutos) pending.push({ step: 7, key: "duracion", label: "Definir la duración del turno" });
  if (payload.modalidadOperacion !== "ACCESO_LIBRE" && (!payload.generacionClasesDesde || !payload.generacionClasesHasta)) pending.push({ step: 10, key: "generacion", label: "Definir el período inicial de clases" });
  if (payload.generacionClasesDesde && payload.generacionClasesHasta && payload.generacionClasesDesde > payload.generacionClasesHasta) pending.push({ step: 10, key: "generacion-rango", label: "Corregir el período inicial de clases" });
  if (payload.modalidadOperacion === "EVENTO_UNICO" && payload.generacionClasesDesde && payload.generacionClasesHasta && payload.generacionClasesDesde !== payload.generacionClasesHasta) pending.push({ step: 10, key: "evento-fecha", label: "El evento único debe generarse en una sola fecha" });
  if (payload.generacionClasesDesde && payload.generacionClasesHasta && (Date.parse(payload.generacionClasesHasta) - Date.parse(payload.generacionClasesDesde)) / 86_400_000 > 184) pending.push({ step: 10, key: "generacion-maxima", label: "El período inicial no puede superar seis meses" });
  return pending;
}

function map(row: any) {
  const payload = activityDraftPayloadSchema.parse(row.payload);
  const pending = activityDraftPending(payload);
  return { id: row.id, activityId: row.actividadId, name: row.nombre, modality: row.modalidad, currentStep: row.pasoActual, status: row.estado === "PUBLICANDO" ? "PUBLICANDO" : pending.length ? "INCOMPLETO" : "COMPLETO", hasChanges: draftHasChanges(payload, readDraftMetadata(row.payload)), lastEditedBy: row.creadoPor ? [row.creadoPor.nombre, row.creadoPor.apellido].filter(Boolean).join(" ") : null, payload, pending, completion: Math.round(((8 - new Set(pending.map((item) => item.step)).size) / 8) * 100), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function createActivityDraft(userId: string) { return map(await prisma.actividadBorrador.create({ data: { creadoPorId: userId, payload: { ...emptyActivityDraftPayload, __draft: { baseline: draftFingerprint(emptyActivityDraftPayload) } } as unknown as Prisma.InputJsonValue, estado: "SIN_CAMBIOS" }, include: draftEditor })); }
export async function createActivityEditDraft(activityId: string, userId: string) {
  const activity = await prisma.actividad.findUnique({
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
  if (!activity) throw new CatalogNotFoundError("Actividad no encontrada.");
  const classDates = activity.horarios.flatMap((schedule) => schedule.clases.map((session) => session.fecha)).sort((a, b) => a.getTime() - b.getTime());
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
    generacionClasesDesde: classDates[0]?.toISOString().slice(0, 10) ?? null,
    generacionClasesHasta: classDates.at(-1)?.toISOString().slice(0, 10) ?? null,
    fechasExcluidas: [],
    schedules: activity.horarios.map((schedule) => ({ id: schedule.id, establecimientoId: schedule.establecimientoId, diaSemana: schedule.diaSemana, horaInicio: schedule.horaInicio, horaFin: schedule.horaFin, espacio: schedule.espacio, cupoMaximo: schedule.cupoMaximo, profesorIds: schedule.profesores.map((item) => item.profesorId), recursoIds: schedule.recursos.map((item) => item.recursoId), teacherAssignments: [...new Map(schedule.clases.map((item) => [`${item.horaInicio}:${item.horaFin}`, { startTime: item.horaInicio, endTime: item.horaFin, professorIds: item.profesores.map((link) => link.profesorId) }])).values()] })),
  });
  const existing = await prisma.actividadBorrador.findUnique({ where: { actividadId: activityId }, include: draftEditor });
  if (existing && existing.publicadoAt === null) {
    if (existing.estado === "PUBLICANDO") throw new CatalogConflictError("La actividad se está guardando en otra sesión. Intentá nuevamente en unos segundos.");
    const metadata = readDraftMetadata(existing.payload);
    if (existing.estado !== "SIN_CAMBIOS" || (metadata?.baseline === draftFingerprint(payload) && metadata.activityUpdatedAt === activity.updatedAt.toISOString())) return map(existing);
  }
  const data = { creadoPorId: userId, nombre: activity.nombre, modalidad: activity.modalidadOperacion, pasoActual: 1, payload: { ...payload, __draft: { baseline: draftFingerprint(payload), activityUpdatedAt: activity.updatedAt.toISOString() } } as unknown as Prisma.InputJsonValue, estado: "SIN_CAMBIOS", publicadoAt: null, updatedAt: existing ? nextDraftTimestamp(existing.updatedAt) : new Date() };
  if (!existing) return map(await prisma.actividadBorrador.create({ data: { ...data, actividadId: activityId }, include: draftEditor }));
  const refreshed = await prisma.actividadBorrador.updateMany({ where: { id: existing.id, updatedAt: existing.updatedAt }, data });
  if (!refreshed.count) throw new CatalogConflictError(conflictMessage);
  return map(await prisma.actividadBorrador.findUniqueOrThrow({ where: { id: existing.id }, include: draftEditor }));
}
export async function listActivityDrafts() {
  return (await prisma.actividadBorrador.findMany({ where: { publicadoAt: null, estado: { not: "SIN_CAMBIOS" } }, include: draftEditor, orderBy: { updatedAt: "desc" } })).map(map);
}
export async function getActivityDraft(id: string) {
  const row = await prisma.actividadBorrador.findUnique({ where: { id }, include: draftEditor });
  return row && !row.publicadoAt ? map(row) : null;
}
export async function saveActivityDraft(id: string, userId: string, payload: ActivityDraftPayload, expectedUpdatedAt: string, currentStep?: number) {
  return prisma.$transaction(async (tx) => {
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
        payload: { ...payload, ...(metadata ? { __draft: metadata } : {}) } as unknown as Prisma.InputJsonValue,
        estado: changed ? pending.length ? "INCOMPLETO" : "COMPLETO" : "SIN_CAMBIOS",
        updatedAt: nextDraftTimestamp(existing.updatedAt),
      },
    });
    if (!result.count) throw new CatalogConflictError(conflictMessage);
    return map(await tx.actividadBorrador.findUniqueOrThrow({ where: { id }, include: draftEditor }));
  });
}
export async function deleteActivityDraft(id: string, expectedUpdatedAt: string) {
  const result = await prisma.actividadBorrador.deleteMany({ where: { id, updatedAt: new Date(expectedUpdatedAt), publicadoAt: null, estado: { not: "PUBLICANDO" } } });
  if (!result.count) throw new CatalogConflictError(conflictMessage);
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
    return await publishActivityDraftContents(id, userId);
  } catch (error) {
    await prisma.actividadBorrador.updateMany({ where: { id, estado: "PUBLICANDO", updatedAt: claimedAt }, data: { estado: row.estado, updatedAt: row.updatedAt } });
    throw error;
  }
}

async function publishActivityDraftContents(id: string, userId: string) {
  const draft = await getActivityDraft(id);
  if (!draft) throw new CatalogNotFoundError("Borrador no encontrado.");
  if (draft.activityId && !draft.hasChanges) {
    const activity = await getActividad(draft.activityId);
    await prisma.actividadBorrador.update({ where: { id }, data: { publicadoAt: new Date(), estado: "PUBLICADO", creadoPorId: userId } });
    return activity;
  }
  if (draft.pending.length) throw new CatalogValidationError(`La actividad todavía está incompleta: ${draft.pending.map((item) => item.label).join(", ")}.`);
  const p = draft.payload;
  if (!p.modalidadOperacion) throw new CatalogValidationError("Elegí una modalidad para continuar.");
  if (!draft.activityId) for (const schedule of p.schedules) {
    const usesTurns=["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion);
    for(const assignment of effectiveTeacherAssignments(schedule,p.duracionTurnoMinutos,p.intervaloTurnoMinutos,usesTurns))await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:assignment.startTime,horaFin:assignment.endTime,espacio:null,profesoresIds:assignment.professorIds,recursos:[],excludeId:schedule.id});
    await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,espacio:schedule.espacio,profesoresIds:[],recursos:schedule.recursoIds.map((recursoId)=>({recursoId,cantidadReservada:1,exclusivo:false})),excludeId:schedule.id});
  }
  if (draft.activityId) {
    const current = await prisma.actividad.findUnique({where:{id:draft.activityId},include:{horarios:{include:{profesores:true,recursos:true,clases:{where:{estado:{not:"CANCELADA"}},select:{horaInicio:true,horaFin:true,profesores:{select:{profesorId:true}}}}}},publicosObjetivo:true,requisitos:true}});
    if(!current)throw new CatalogNotFoundError("Actividad no encontrada.");
    const normalizeScheduleStructure=(items:any[])=>items.map(item=>({id:item.id??null,diaSemana:item.diaSemana,horaInicio:item.horaInicio,horaFin:item.horaFin})).sort((a,b)=>`${a.id}${a.diaSemana}`.localeCompare(`${b.id}${b.diaSemana}`));
    const normalizeSchedules=(items:any[])=>items.map(item=>({id:item.id??null,establecimientoId:item.establecimientoId,diaSemana:item.diaSemana,horaInicio:item.horaInicio,horaFin:item.horaFin,espacio:item.espacio??null,cupoMaximo:item.cupoMaximo,profesorIds:[...new Set<string>(item.profesorIds??item.profesores?.map((link:any)=>link.profesorId)??[])].sort(),recursoIds:[...new Set<string>(item.recursoIds??item.recursos?.map((link:any)=>link.recursoId)??[])].sort(),teacherAssignments:(item.teacherAssignments??[...new Map((item.clases??[]).map((session:any)=>[`${session.horaInicio}:${session.horaFin}`,{startTime:session.horaInicio,endTime:session.horaFin,professorIds:session.profesores.map((link:any)=>link.profesorId)}])).values()]).map((assignment:any)=>({...assignment,professorIds:[...assignment.professorIds].sort()})).sort((a:any,b:any)=>a.startTime.localeCompare(b.startTime))})).sort((a,b)=>`${a.id}${a.diaSemana}`.localeCompare(`${b.id}${b.diaSemana}`));
    const scheduleStructureChanged=JSON.stringify(normalizeScheduleStructure(p.schedules))!==JSON.stringify(normalizeScheduleStructure(current.horarios));
    const schedulesChanged=JSON.stringify(normalizeSchedules(p.schedules))!==JSON.stringify(normalizeSchedules(current.horarios));
    if(schedulesChanged)for(const schedule of p.schedules){const usesTurns=["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion);for(const assignment of effectiveTeacherAssignments(schedule,p.duracionTurnoMinutos,p.intervaloTurnoMinutos,usesTurns))await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:assignment.startTime,horaFin:assignment.endTime,espacio:null,profesoresIds:assignment.professorIds,recursos:[],excludeId:schedule.id});await assertActivityScheduleAvailability({establishmentId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,espacio:schedule.espacio,profesoresIds:[],recursos:schedule.recursoIds.map(recursoId=>({recursoId,cantidadReservada:1,exclusivo:false})),excludeId:schedule.id});}
    const changes:any={};
    const scalarPairs:Array<[string,unknown,unknown]>= [["nombre",p.nombre,current.nombre],["descripcionCorta",p.descripcionCorta,current.descripcionCorta],["descripcion",p.descripcion,current.descripcion],["imagenUrl",p.imagenUrl,current.imagenUrl],["color",p.color,current.color],["nivel",p.nivel,current.nivel],["esGratuita",p.esGratuita,current.esGratuita],["precio",p.precio,current.precio?.toString()??null],["modalidadInscripcion",p.modalidadInscripcion,current.modalidadInscripcion],["duracionPeriodoMeses",p.duracionPeriodoMeses,current.duracionPeriodoMeses],["horasCancelacionJustificada",p.horasCancelacionJustificada,current.horasCancelacionJustificada],["modalidadOperacion",p.modalidadOperacion,current.modalidadOperacion],["vigenciaReserva",p.vigenciaReserva,current.vigenciaReserva],["duracionTurnoMinutos",p.duracionTurnoMinutos,current.duracionTurnoMinutos],["intervaloTurnoMinutos",p.intervaloTurnoMinutos,current.intervaloTurnoMinutos],["anticipacionReservaDias",p.anticipacionReservaDias,current.anticipacionReservaDias],["limiteReservasPorUsuario",p.limiteReservasPorUsuario,current.limiteReservasPorUsuario],["requiereReserva",p.requiereReserva,current.requiereReserva],["cupo",p.cupo,current.cupo],["categoriaActividadId",p.categoriaActividadId,current.categoriaActividadId]];
    for(const[key,next,previous]of scalarPairs)if(String(next??"")!==String(previous??""))changes[key]=next;
    const publics=[...p.publicosObjetivoIds].sort(),currentPublics=current.publicosObjetivo.map(item=>item.publicoObjetivoId).sort();if(JSON.stringify(publics)!==JSON.stringify(currentPublics))changes.publicosObjetivoIds=p.publicosObjetivoIds;
    const requirements=p.requirements.map(item=>({...item})).sort((a,b)=>a.requisitoId.localeCompare(b.requisitoId)),currentRequirements=current.requisitos.map(item=>({requisitoId:item.requisitoId,obligatorio:item.obligatorio,observaciones:item.observaciones,orden:item.orden})).sort((a,b)=>a.requisitoId.localeCompare(b.requisitoId));if(JSON.stringify(requirements)!==JSON.stringify(currentRequirements))changes.requirements=p.requirements;
    if(scheduleStructureChanged)changes.horarios=p.schedules.map(schedule=>({id:schedule.id,establecimientoId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin}));
    const activity=Object.keys(changes).length?await patchActividad(draft.activityId,changes):await getActividad(draft.activityId);
    if(!activity)throw new CatalogNotFoundError("Actividad no encontrada.");
    if(schedulesChanged){const used=new Set<string>();for(const schedule of p.schedules){const target=schedule.id?activity.horarios.find(item=>item.id===schedule.id):activity.horarios.find(item=>!used.has(item.id!)&&item.diaSemana===schedule.diaSemana&&item.horaInicio===schedule.horaInicio&&item.horaFin===schedule.horaFin);if(!target?.id)throw new CatalogValidationError("No pudimos vincular uno de los horarios actualizados.");used.add(target.id);const previous=current.horarios.find(item=>item.id===target.id);const updated=await updateActivitySchedule(target.id,{establecimientoId:schedule.establecimientoId,espacio:schedule.espacio,cupoMaximo:schedule.cupoMaximo,profesoresIds:schedule.profesorIds,profesorPrincipalId:schedule.profesorIds[0]??null,duracionTurnoMinutos:p.duracionTurnoMinutos,intervaloTurnoMinutos:p.intervaloTurnoMinutos,recursos:schedule.recursoIds.map(recursoId=>({recursoId,cantidadReservada:1,estrategiaAsignacion:"AL_INGRESAR",exclusivo:false}))},undefined,{ignoreProfessorConflicts:true});const usesTurns=["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion);await syncGeneratedSessionTeachers(target.id,effectiveTeacherAssignments(schedule,p.duracionTurnoMinutos,p.intervaloTurnoMinutos,usesTurns));const professorUsers=await prisma.profesor.findMany({where:{id:{in:updated.professors.map((item:{id:string})=>item.id)}},select:{id:true,usuarioId:true}}),userByProfessor=new Map(professorUsers.map(item=>[item.id,item.usuarioId]));await notifyTeacherAssignmentChanges(prisma,{previous:(previous?.profesores??[]).map(item=>({professorId:item.profesorId,isPrimary:item.esPrincipal,userId:userByProfessor.get(item.profesorId)??""})),current:updated.professors.map((item:{id:string;isPrimary:boolean})=>({professorId:item.id,isPrimary:item.isPrimary,userId:userByProfessor.get(item.id)??""})),context:{kind:"schedule",entityId:updated.id,activityName:updated.activity.name,establishmentId:updated.establishmentId,establishmentName:updated.establishment.name,space:updated.space,day:updated.day,startTime:updated.startTime,endTime:updated.endTime},senderId:userId,operationKey:`workflow:${id}:${new Date(draft.updatedAt).getTime()}`});}}
    await prisma.actividadBorrador.update({ where: { id }, data: { publicadoAt: new Date(), estado: "PUBLICADO", creadoPorId: userId } });
    return activity;
  }
  const input = actividadSchema.parse({ nombre: p.nombre, descripcionCorta: p.descripcionCorta, descripcion: p.descripcion, imagenUrl: p.imagenUrl, color: p.color, nivel: p.nivel, edadMinima: p.edadMinima, edadMaxima: p.edadMaxima, requiereCertificadoMedico: false, requiereAutorizacion: false, esGratuita: p.esGratuita, precio: p.precio, modalidadInscripcion: p.modalidadInscripcion, duracionPeriodoMeses: p.duracionPeriodoMeses, horasCancelacionJustificada: p.horasCancelacionJustificada, modalidadOperacion: p.modalidadOperacion, vigenciaReserva: p.vigenciaReserva, duracionTurnoMinutos: p.duracionTurnoMinutos, intervaloTurnoMinutos: p.intervaloTurnoMinutos, anticipacionReservaDias: p.anticipacionReservaDias, limiteReservasPorUsuario: p.limiteReservasPorUsuario, requiereReserva: p.requiereReserva, cupo: p.cupo, estado: "BORRADOR", categoriaActividadId: p.categoriaActividadId, publicosObjetivoIds: p.publicosObjetivoIds, requirements: p.requirements, horarios: [], asignados: [] });
  const activity = await createActividad(input);
  try {
    const createdSchedules = [];
    for (const schedule of p.schedules) { const created=await createActivitySchedule({ actividadId: activity.id, establecimientoId: schedule.establecimientoId, diaSemana: schedule.diaSemana, horaInicio: schedule.horaInicio, horaFin: schedule.horaFin, espacio: schedule.espacio, observaciones: null, cupoMaximo: schedule.cupoMaximo, permiteListaEspera: true, permiteSobrecupo: false, sobrecupoMaximo: null, estado: "ACTIVO", profesoresIds: schedule.profesorIds, profesorPrincipalId: schedule.profesorIds[0] ?? null, duracionTurnoMinutos: p.duracionTurnoMinutos, intervaloTurnoMinutos: p.intervaloTurnoMinutos, recursos: schedule.recursoIds.map((recursoId) => ({ recursoId, cantidadReservada: 1, estrategiaAsignacion: "AL_INGRESAR", exclusivo: false })) });createdSchedules.push(created);const professorUsers=await prisma.profesor.findMany({where:{id:{in:created.professors.map((item:{id:string})=>item.id)}},select:{id:true,usuarioId:true}}),userByProfessor=new Map(professorUsers.map(item=>[item.id,item.usuarioId]));await notifyTeacherAssignmentChanges(prisma,{previous:[],current:created.professors.map((item:{id:string;isPrimary:boolean})=>({professorId:item.id,isPrimary:item.isPrimary,userId:userByProfessor.get(item.id)??""})),context:{kind:"schedule",entityId:created.id,activityName:created.activity.name,establishmentId:created.establishmentId,establishmentName:created.establishment.name,space:created.space,day:created.day,startTime:created.startTime,endTime:created.endTime},senderId:userId,operationKey:`workflow:${id}:${new Date(draft.updatedAt).getTime()}`}); }
    if (p.modalidadOperacion !== "ACCESO_LIBRE" && p.generacionClasesDesde && p.generacionClasesHasta) { const usesTurns=["TURNO_RECURRENTE","TURNO_PUNTUAL"].includes(p.modalidadOperacion);await Promise.all(createdSchedules.map((schedule,index) => generateActivitySessionsBulk({ activityScheduleId: schedule.id, dateFrom: p.generacionClasesDesde!, dateTo: p.generacionClasesHasta!, excludedDates: p.fechasExcluidas, teacherAssignments: effectiveTeacherAssignments(p.schedules[index],p.duracionTurnoMinutos,p.intervaloTurnoMinutos,usesTurns) }))); }
  } catch (error) {
    await purgeActivity(activity.id).catch(() => undefined);
    throw error;
  }
  const activeActivity = await patchActividad(activity.id, { estado: "ACTIVA" });
  await prisma.actividadBorrador.update({ where: { id }, data: { actividadId: activity.id, publicadoAt: new Date(), estado: "PUBLICADO", creadoPorId: userId } });
  return activeActivity;
}
