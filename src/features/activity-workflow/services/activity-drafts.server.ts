/* eslint-disable @typescript-eslint/no-explicit-any -- Normalización diferencial entre borradores y relaciones Prisma legadas. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { actividadSchema } from "@/features/actividades/schemas/actividad.schema";
import { createActividad, getActividad, patchActividad, purgeActivity } from "@/features/actividades/services/actividades.server";
import { assertActivityScheduleAvailability, createActivitySchedule, updateActivitySchedule } from "@/features/activity-schedules/services/activity-schedules.server";
import { generateActivitySessionsBulk } from "@/features/activity-sessions/services/activity-sessions.server";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { activityDraftPayloadSchema, type ActivityDraftPayload } from "../schemas/activity-draft.schema";

export const emptyActivityDraftPayload: ActivityDraftPayload = activityDraftPayloadSchema.parse({});

export function activityDraftPending(payload: ActivityDraftPayload) {
  const pending: Array<{ step: number; key: string; label: string }> = [];
  if (!payload.modalidadOperacion) pending.push({ step: 1, key: "modalidad", label: "Elegir una modalidad" });
  if (!payload.nombre.trim()) pending.push({ step: 2, key: "nombre", label: "Indicar el nombre de la actividad" });
  if (!payload.categoriaActividadId) pending.push({ step: 2, key: "categoria", label: "Seleccionar una categoría" });
  if (!payload.establecimientoId) pending.push({ step: 3, key: "establecimiento", label: "Seleccionar un establecimiento" });
  if (!payload.schedules.length) pending.push({ step: 4, key: "horarios", label: "Configurar al menos un horario" });
  if (payload.requiereReserva && (!payload.cupo || payload.cupo < 1)) pending.push({ step: 5, key: "cupo", label: "Definir el cupo" });
  const needsTeacher = payload.modalidadOperacion && !["ACCESO_LIBRE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion);
  if (needsTeacher && !payload.schedules.some((item) => item.profesorIds.length)) pending.push({ step: 6, key: "profesor", label: "Asignar un profesor aprobado" });
  if (["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(payload.modalidadOperacion ?? "") && !payload.duracionTurnoMinutos) pending.push({ step: 9, key: "duracion", label: "Definir la duración del turno" });
  if (payload.modalidadOperacion !== "ACCESO_LIBRE" && (!payload.generacionClasesDesde || !payload.generacionClasesHasta)) pending.push({ step: 9, key: "generacion", label: "Definir el período inicial de clases" });
  if (payload.generacionClasesDesde && payload.generacionClasesHasta && payload.generacionClasesDesde > payload.generacionClasesHasta) pending.push({ step: 9, key: "generacion-rango", label: "Corregir el período inicial de clases" });
  if (payload.modalidadOperacion === "EVENTO_UNICO" && payload.generacionClasesDesde && payload.generacionClasesHasta && payload.generacionClasesDesde !== payload.generacionClasesHasta) pending.push({ step: 9, key: "evento-fecha", label: "El evento único debe generarse en una sola fecha" });
  if (payload.generacionClasesDesde && payload.generacionClasesHasta && (Date.parse(payload.generacionClasesHasta) - Date.parse(payload.generacionClasesDesde)) / 86_400_000 > 184) pending.push({ step: 9, key: "generacion-maxima", label: "El período inicial no puede superar seis meses" });
  return pending;
}

function map(row: any) {
  const payload = activityDraftPayloadSchema.parse(row.payload);
  const pending = activityDraftPending(payload);
  return { id: row.id, activityId: row.actividadId, name: row.nombre, modality: row.modalidad, currentStep: row.pasoActual, status: pending.length ? "INCOMPLETO" : "COMPLETO", payload, pending, completion: Math.round(((8 - new Set(pending.map((item) => item.step)).size) / 8) * 100), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function createActivityDraft(userId: string) { return map(await prisma.actividadBorrador.create({ data: { creadoPorId: userId, payload: emptyActivityDraftPayload as unknown as Prisma.InputJsonValue } })); }
export async function createActivityEditDraft(activityId: string, userId: string) {
  const activity = await prisma.actividad.findUnique({
    where: { id: activityId },
    include: {
      publicosObjetivo: true,
      requisitos: true,
      horarios: {
        where: { estado: { in: ["ACTIVO", "SUSPENDIDO"] } },
        include: { profesores: true, recursos: true, clases: { where: { estado: { not: "CANCELADA" } }, select: { fecha: true }, orderBy: { fecha: "asc" } } },
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
    establecimientoId: activity.establecimientoId,
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
    schedules: activity.horarios.map((schedule) => ({ id: schedule.id, diaSemana: schedule.diaSemana, horaInicio: schedule.horaInicio, horaFin: schedule.horaFin, espacio: schedule.espacio, cupoMaximo: schedule.cupoMaximo, profesorIds: schedule.profesores.map((item) => item.profesorId), recursoIds: schedule.recursos.map((item) => item.recursoId) })),
  });
  const existing = await prisma.actividadBorrador.findUnique({ where: { actividadId: activityId } });
  if (existing && existing.publicadoAt === null) return map(existing);
  const data = { creadoPorId: userId, nombre: activity.nombre, modalidad: activity.modalidadOperacion, pasoActual: 1, payload: payload as unknown as Prisma.InputJsonValue, estado: activityDraftPending(payload).length ? "INCOMPLETO" : "COMPLETO", publicadoAt: null };
  return map(existing ? await prisma.actividadBorrador.update({ where: { id: existing.id }, data }) : await prisma.actividadBorrador.create({ data: { ...data, actividadId: activityId } }));
}
export async function listActivityDrafts() { return (await prisma.actividadBorrador.findMany({ where: { publicadoAt: null }, orderBy: { updatedAt: "desc" } })).map(map); }
export async function getActivityDraft(id: string) { const row = await prisma.actividadBorrador.findUnique({ where: { id } }); return row ? map(row) : null; }
export async function saveActivityDraft(id: string, userId: string, payload: ActivityDraftPayload, currentStep?: number) { const existing = await prisma.actividadBorrador.findUnique({ where: { id } }); if (!existing) throw new CatalogNotFoundError("Borrador no encontrado."); const pending = activityDraftPending(payload); return map(await prisma.actividadBorrador.update({ where: { id }, data: { creadoPorId: userId, nombre: payload.nombre.trim() || "Actividad sin nombre", modalidad: payload.modalidadOperacion, pasoActual: currentStep ?? existing.pasoActual, payload: payload as unknown as Prisma.InputJsonValue, estado: pending.length ? "INCOMPLETO" : "COMPLETO" } })); }
export async function deleteActivityDraft(id: string) { return prisma.actividadBorrador.delete({ where: { id } }); }

export async function publishActivityDraft(id: string, userId: string) {
  const draft = await getActivityDraft(id);
  if (!draft) throw new CatalogNotFoundError("Borrador no encontrado.");
  if (draft.pending.length) throw new CatalogValidationError(`La actividad todavía está incompleta: ${draft.pending.map((item) => item.label).join(", ")}.`);
  const p = draft.payload;
  if (!p.modalidadOperacion) throw new CatalogValidationError("Elegí una modalidad para continuar.");
  if (!draft.activityId) for (const schedule of p.schedules) {
    await assertActivityScheduleAvailability({
      establishmentId: p.establecimientoId,
      diaSemana: schedule.diaSemana,
      horaInicio: schedule.horaInicio,
      horaFin: schedule.horaFin,
      espacio: schedule.espacio,
      profesoresIds: schedule.profesorIds,
      recursos: schedule.recursoIds.map((recursoId) => ({ recursoId, cantidadReservada: 1, exclusivo: false })),
      excludeId: schedule.id,
    });
  }
  if (draft.activityId) {
    const current = await prisma.actividad.findUnique({where:{id:draft.activityId},include:{horarios:{include:{profesores:true,recursos:true}},publicosObjetivo:true,requisitos:true}});
    if(!current)throw new CatalogNotFoundError("Actividad no encontrada.");
    const normalizeSchedules=(items:any[])=>items.map(item=>({id:item.id??null,diaSemana:item.diaSemana,horaInicio:item.horaInicio,horaFin:item.horaFin,espacio:item.espacio??null,cupoMaximo:item.cupoMaximo,profesorIds:[...(item.profesorIds??item.profesores?.map((link:any)=>link.profesorId)??[])].sort(),recursoIds:[...(item.recursoIds??item.recursos?.map((link:any)=>link.recursoId)??[])].sort()})).sort((a,b)=>`${a.id}${a.diaSemana}`.localeCompare(`${b.id}${b.diaSemana}`));
    const schedulesChanged=JSON.stringify(normalizeSchedules(p.schedules))!==JSON.stringify(normalizeSchedules(current.horarios));
    if(schedulesChanged)for(const schedule of p.schedules)await assertActivityScheduleAvailability({establishmentId:p.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,espacio:schedule.espacio,profesoresIds:schedule.profesorIds,recursos:schedule.recursoIds.map(recursoId=>({recursoId,cantidadReservada:1,exclusivo:false})),excludeId:schedule.id});
    const changes:any={};
    const scalarPairs:Array<[string,unknown,unknown]>= [["nombre",p.nombre,current.nombre],["descripcionCorta",p.descripcionCorta,current.descripcionCorta],["descripcion",p.descripcion,current.descripcion],["imagenUrl",p.imagenUrl,current.imagenUrl],["color",p.color,current.color],["nivel",p.nivel,current.nivel],["esGratuita",p.esGratuita,current.esGratuita],["precio",p.precio,current.precio?.toString()??null],["modalidadInscripcion",p.modalidadInscripcion,current.modalidadInscripcion],["duracionPeriodoMeses",p.duracionPeriodoMeses,current.duracionPeriodoMeses],["horasCancelacionJustificada",p.horasCancelacionJustificada,current.horasCancelacionJustificada],["modalidadOperacion",p.modalidadOperacion,current.modalidadOperacion],["vigenciaReserva",p.vigenciaReserva,current.vigenciaReserva],["duracionTurnoMinutos",p.duracionTurnoMinutos,current.duracionTurnoMinutos],["intervaloTurnoMinutos",p.intervaloTurnoMinutos,current.intervaloTurnoMinutos],["anticipacionReservaDias",p.anticipacionReservaDias,current.anticipacionReservaDias],["limiteReservasPorUsuario",p.limiteReservasPorUsuario,current.limiteReservasPorUsuario],["requiereReserva",p.requiereReserva,current.requiereReserva],["establecimientoId",p.establecimientoId,current.establecimientoId],["cupo",p.cupo,current.cupo],["categoriaActividadId",p.categoriaActividadId,current.categoriaActividadId]];
    for(const[key,next,previous]of scalarPairs)if(String(next??"")!==String(previous??""))changes[key]=next;
    const publics=[...p.publicosObjetivoIds].sort(),currentPublics=current.publicosObjetivo.map(item=>item.publicoObjetivoId).sort();if(JSON.stringify(publics)!==JSON.stringify(currentPublics))changes.publicosObjetivoIds=p.publicosObjetivoIds;
    const requirements=p.requirements.map(item=>({...item})).sort((a,b)=>a.requisitoId.localeCompare(b.requisitoId)),currentRequirements=current.requisitos.map(item=>({requisitoId:item.requisitoId,obligatorio:item.obligatorio,observaciones:item.observaciones,orden:item.orden})).sort((a,b)=>a.requisitoId.localeCompare(b.requisitoId));if(JSON.stringify(requirements)!==JSON.stringify(currentRequirements))changes.requirements=p.requirements;
    if(schedulesChanged)changes.horarios=p.schedules.map(schedule=>({id:schedule.id,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin}));
    const activity=Object.keys(changes).length?await patchActividad(draft.activityId,changes):await getActividad(draft.activityId);
    if(!activity)throw new CatalogNotFoundError("Actividad no encontrada.");
    if(schedulesChanged){const used=new Set<string>();for(const schedule of p.schedules){const target=schedule.id?activity.horarios.find(item=>item.id===schedule.id):activity.horarios.find(item=>!used.has(item.id!)&&item.diaSemana===schedule.diaSemana&&item.horaInicio===schedule.horaInicio&&item.horaFin===schedule.horaFin);if(!target?.id)throw new CatalogValidationError("No pudimos vincular uno de los horarios actualizados.");used.add(target.id);await updateActivitySchedule(target.id,{espacio:schedule.espacio,cupoMaximo:schedule.cupoMaximo,profesoresIds:schedule.profesorIds,profesorPrincipalId:schedule.profesorIds[0]??null,duracionTurnoMinutos:p.duracionTurnoMinutos,intervaloTurnoMinutos:p.intervaloTurnoMinutos,recursos:schedule.recursoIds.map(recursoId=>({recursoId,cantidadReservada:1,estrategiaAsignacion:"AL_INGRESAR",exclusivo:false}))});}}
    await prisma.actividadBorrador.update({ where: { id }, data: { publicadoAt: new Date(), estado: "PUBLICADO", creadoPorId: userId } });
    return activity;
  }
  const input = actividadSchema.parse({ nombre: p.nombre, descripcionCorta: p.descripcionCorta, descripcion: p.descripcion, imagenUrl: p.imagenUrl, color: p.color, nivel: p.nivel, edadMinima: p.edadMinima, edadMaxima: p.edadMaxima, requiereCertificadoMedico: false, requiereAutorizacion: false, esGratuita: p.esGratuita, precio: p.precio, modalidadInscripcion: p.modalidadInscripcion, duracionPeriodoMeses: p.duracionPeriodoMeses, horasCancelacionJustificada: p.horasCancelacionJustificada, modalidadOperacion: p.modalidadOperacion, vigenciaReserva: p.vigenciaReserva, duracionTurnoMinutos: p.duracionTurnoMinutos, intervaloTurnoMinutos: p.intervaloTurnoMinutos, anticipacionReservaDias: p.anticipacionReservaDias, limiteReservasPorUsuario: p.limiteReservasPorUsuario, requiereReserva: p.requiereReserva, establecimientoId: p.establecimientoId, cupo: p.cupo, estado: "BORRADOR", categoriaActividadId: p.categoriaActividadId, publicosObjetivoIds: p.publicosObjetivoIds, requirements: p.requirements, horarios: [], asignados: [] });
  const activity = await createActividad(input);
  try {
    const createdSchedules = [];
    for (const schedule of p.schedules) createdSchedules.push(await createActivitySchedule({ actividadId: activity.id, establecimientoId: p.establecimientoId, diaSemana: schedule.diaSemana, horaInicio: schedule.horaInicio, horaFin: schedule.horaFin, espacio: schedule.espacio, observaciones: null, cupoMaximo: schedule.cupoMaximo, permiteListaEspera: true, permiteSobrecupo: false, sobrecupoMaximo: null, estado: "ACTIVO", profesoresIds: schedule.profesorIds, profesorPrincipalId: schedule.profesorIds[0] ?? null, duracionTurnoMinutos: p.duracionTurnoMinutos, intervaloTurnoMinutos: p.intervaloTurnoMinutos, recursos: schedule.recursoIds.map((recursoId) => ({ recursoId, cantidadReservada: 1, estrategiaAsignacion: "AL_INGRESAR", exclusivo: false })) }));
    if (p.modalidadOperacion !== "ACCESO_LIBRE" && p.generacionClasesDesde && p.generacionClasesHasta) await Promise.all(createdSchedules.map((schedule) => generateActivitySessionsBulk({ activityScheduleId: schedule.id, dateFrom: p.generacionClasesDesde!, dateTo: p.generacionClasesHasta!, excludedDates: p.fechasExcluidas })));
  } catch (error) {
    await purgeActivity(activity.id).catch(() => undefined);
    throw error;
  }
  const activeActivity = await patchActividad(activity.id, { estado: "ACTIVA" });
  await prisma.actividadBorrador.update({ where: { id }, data: { actividadId: activity.id, publicadoAt: new Date(), estado: "PUBLICADO", creadoPorId: userId } });
  return activeActivity;
}
