import { InscripcionEstado, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogConflictError, CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import type { CreateEnrollmentInput, EnrollmentFilters, UpdateEnrollmentInput } from "../types/enrollment.types";
import { getEnrollmentDocumentationSummaries } from "@/features/enrollment-documents/services/enrollment-documents.server";
import { createNotification, notifyAdministrators } from "@/features/notifications/services/notifications.server";
import { assertEnrollmentAge, evaluateEnrollmentAge } from "../helpers/enrollment-age";

const scheduleSummary={include:{actividad:{select:{id:true,nombre:true}},establecimiento:{select:{id:true,nombre:true}}}} as const;
const include={usuario:{select:{id:true,nombre:true,apellido:true,documento:true,email:true,deletedAt:true}},horarioActividad:scheduleSummary,horarios:{include:{horarioActividad:scheduleSummary},orderBy:{horarioActividad:{diaSemana:"asc"}}}} satisfies Prisma.InscripcionInclude;
const clean=(value?:string|null)=>value?.trim()||null;
const transitions:Record<InscripcionEstado,InscripcionEstado[]>={PENDIENTE:["CONFIRMADA","LISTA_ESPERA","RECHAZADA","CANCELADA"],LISTA_ESPERA:["CONFIRMADA","CANCELADA","RECHAZADA"],CONFIRMADA:["CANCELADA","BAJA"],CANCELADA:["CONFIRMADA","LISTA_ESPERA"],RECHAZADA:["PENDIENTE"],BAJA:["CONFIRMADA","LISTA_ESPERA"]};

async function capacity(tx:Prisma.TransactionClient,schedule:any,slot?:{horaInicio:string|null}){const today=new Date();today.setUTCHours(0,0,0,0);const scope=slot?.horaInicio?{horarios:{some:{horarioActividadId:schedule.id,horaInicio:slot.horaInicio}}}:{OR:[{horarios:{some:{horarioActividadId:schedule.id,horaInicio:null}}},{horarioActividadId:schedule.id}]};const base={modalidad:{not:"POR_CLASE" as const},AND:[scope,{OR:[{fechaFin:null},{fechaFin:{gte:today}}]}]};const [confirmed,waitlist]=await Promise.all([tx.inscripcion.count({where:{...base,estado:"CONFIRMADA"}}),tx.inscripcion.count({where:{...base,estado:"LISTA_ESPERA"}})]);const over=schedule.permiteSobrecupo?(schedule.sobrecupoMaximo??0):0,total=schedule.cupoMaximo+over;return{maxCapacity:schedule.cupoMaximo,overbookingLimit:schedule.permiteSobrecupo?schedule.sobrecupoMaximo:null,totalCapacity:total,confirmedCount:confirmed,normalAvailableCount:Math.max(schedule.cupoMaximo-confirmed,0),availableCount:Math.max(total-confirmed,0),waitlistCount:waitlist};}
async function map(tx:Prisma.TransactionClient,row:any){const cap=await capacity(tx,row.horarioActividad);let waitlistPosition:null|number=null;if(row.estado==="LISTA_ESPERA"){waitlistPosition=await tx.inscripcion.count({where:{horarios:{some:{horarioActividadId:row.horarioActividadId}},estado:"LISTA_ESPERA",OR:[{fechaListaEspera:{lt:row.fechaListaEspera}},{fechaListaEspera:row.fechaListaEspera,createdAt:{lte:row.createdAt}}]}});}const selectedSchedules=row.horarios?.length?row.horarios.map((item:any)=>({schedule:item.horarioActividad,startTime:item.horaInicio??item.horarioActividad.horaInicio,endTime:item.horaFin??item.horarioActividad.horaFin})):[{schedule:row.horarioActividad,startTime:row.horarioActividad.horaInicio,endTime:row.horarioActividad.horaFin}];return{id:row.id,status:row.estado,enrollmentDate:row.fechaInscripcion,confirmationDate:row.fechaConfirmacion,waitlistDate:row.fechaListaEspera,cancellationDate:row.fechaCancelacion,waitlistPosition,observations:row.observaciones,rejectionReason:row.motivoRechazo,cancellationReason:row.motivoCancelacion,user:{id:row.usuario.id,firstName:row.usuario.nombre,lastName:row.usuario.apellido,documentNumber:row.usuario.documento,email:row.usuario.email},activitySchedule:{id:row.horarioActividad.id,day:row.horarioActividad.diaSemana,startTime:row.horarioActividad.horaInicio,endTime:row.horarioActividad.horaFin,activity:{id:row.horarioActividad.actividad.id,name:row.horarioActividad.actividad.nombre},establishment:{id:row.horarioActividad.establecimiento.id,name:row.horarioActividad.establecimiento.nombre}},selectedSchedules:selectedSchedules.map(({schedule,startTime,endTime}:any)=>({id:schedule.id,day:schedule.diaSemana,startTime,endTime,establishment:{id:schedule.establecimiento.id,name:schedule.establecimiento.nombre}})),capacity:cap,createdAt:row.createdAt,updatedAt:row.updatedAt};}
async function serializable<T>(fn:(tx:Prisma.TransactionClient)=>Promise<T>){for(let attempt=0;attempt<3;attempt++){try{return await prisma.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10_000,timeout:30_000});}catch(error){if(!(error instanceof Prisma.PrismaClientKnownRequestError)||error.code!=="P2034"||attempt===2)throw error;}}throw new Error("No se pudo completar la transacción");}
async function lockSchedule(tx:Prisma.TransactionClient,id:string){await tx.$queryRaw`SELECT "id" FROM "ActividadHorario" WHERE "id" = ${id} FOR UPDATE`;const schedule=await tx.horarioActividad.findUnique({where:{id},include:{actividad:{select:{id:true,nombre:true,estado:true,nivel:true,modalidadInscripcion:true,duracionPeriodoMeses:true,publicosObjetivo:{select:{publicoObjetivo:{select:{nombre:true,edadMinimaSugerida:true,edadMaximaSugerida:true,generosAdmitidos:true}}},orderBy:{publicoObjetivo:{orden:"asc"}}},requisitos:{where:{obligatorio:true,requisito:{activo:true,requiereDocumento:true}},select:{requisitoId:true}}}},establecimiento:{select:{id:true,nombre:true}}}});if(!schedule)throw new CatalogNotFoundError("Horario no encontrado.");return schedule;}
async function hasApprovedRequiredDocuments(tx:Prisma.TransactionClient,userId:string,requirementIds:string[]){if(!requirementIds.length)return true;const rows=await tx.documentoUsuario.findMany({where:{usuarioId:userId,requisitoId:{in:requirementIds}},orderBy:[{requisitoId:"asc"},{version:"desc"}],select:{requisitoId:true,estado:true}}),latestStates=new Map<string,string>(),approvedIds=new Set<string>();for(const row of rows){if(!latestStates.has(row.requisitoId))latestStates.set(row.requisitoId,row.estado);if(row.estado==="APROBADO"&&latestStates.get(row.requisitoId)!=="RECHAZADO")approvedIds.add(row.requisitoId)}return requirementIds.every(id=>approvedIds.has(id))}
async function nextState(tx:Prisma.TransactionClient,schedule:any,slot?:{horaInicio:string|null}){if(schedule.estado!=="ACTIVO")throw new CatalogValidationError("El horario no admite nuevas inscripciones.");const cap=await capacity(tx,schedule,slot);if(cap.availableCount>0)return "CONFIRMADA" as const;if(schedule.permiteListaEspera)return "LISTA_ESPERA" as const;throw new CatalogConflictError("No hay cupos disponibles y este horario no permite lista de espera.");}
const minutes=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
async function assertNoRecurringOverlap(tx:Prisma.TransactionClient,userId:string,activityId:string,scopes:Array<{day:string;startTime:string;endTime:string}>){
  const existing=await tx.inscripcion.findMany({where:{usuarioId:userId,estado:{in:["PENDIENTE","CONFIRMADA","LISTA_ESPERA"]},modalidad:{not:"POR_CLASE"},horarioActividad:{actividadId:{not:activityId}}},select:{horarioActividad:{select:{diaSemana:true,horaInicio:true,horaFin:true,actividad:{select:{nombre:true}}}},horarios:{select:{horaInicio:true,horaFin:true,horarioActividad:{select:{diaSemana:true,horaInicio:true,horaFin:true,actividad:{select:{nombre:true}}}}}}}});
  for(const enrollment of existing){const enrolledScopes=enrollment.horarios.length?enrollment.horarios.map(item=>({day:item.horarioActividad.diaSemana,startTime:item.horaInicio??item.horarioActividad.horaInicio,endTime:item.horaFin??item.horarioActividad.horaFin,activity:item.horarioActividad.actividad.nombre})):[{day:enrollment.horarioActividad.diaSemana,startTime:enrollment.horarioActividad.horaInicio,endTime:enrollment.horarioActividad.horaFin,activity:enrollment.horarioActividad.actividad.nombre}];for(const requested of scopes){const conflict=enrolledScopes.find(current=>current.day===requested.day&&minutes(requested.startTime)<minutes(current.endTime)&&minutes(current.startTime)<minutes(requested.endTime));if(conflict)throw new CatalogConflictError(`La persona ya está inscripta en ${conflict.activity} el ${conflict.day.toLowerCase()} de ${conflict.startTime} a ${conflict.endTime}. Elegí otro horario.`);}}
}

export async function createEnrollment(input: CreateEnrollmentInput) {
  return serializable(async (tx) => {
    const user = await tx.usuario.findFirst({
      where: { id: input.usuarioId, deletedAt: null },
      select: { id: true, fechaNacimiento: true, genero: true, estadoParticipacion: true },
    });
    if (!user) throw new CatalogValidationError("El usuario no existe o fue eliminado.");
    if (user.estadoParticipacion !== "HABILITADO") throw new CatalogValidationError("Tu participación está en revisión administrativa y no podés realizar nuevas inscripciones.");
    const requestedSlots = input.horariosSeleccionados ?? [];
    let requestedScheduleIds = requestedSlots.length ? requestedSlots.map(item=>item.horarioActividadId) : input.horarioActividadIds ?? (input.horarioActividadId ? [input.horarioActividadId] : []);
    let activityId = input.actividadId;
    const classId = input.claseActividadId;
    if (classId) {
      const session = await tx.claseActividad.findUnique({ where: { id: classId }, select: { horarioActividadId: true, horarioActividad: { select: { actividadId: true } } } });
      if (!session) throw new CatalogValidationError("La clase seleccionada no existe.");
      activityId = activityId ?? session.horarioActividad.actividadId;
      if (activityId !== session.horarioActividad.actividadId) throw new CatalogValidationError("La clase no pertenece a la actividad seleccionada.");
      requestedScheduleIds = [session.horarioActividadId];
    }
    if (activityId) {
      const activity = await tx.actividad.findUnique({ where: { id: activityId }, select: { modalidadOperacion: true, horarios: { where: { estado: "ACTIVO" }, select: { id: true }, orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] } } });
      if (!activity) throw new CatalogNotFoundError("Actividad no encontrada.");
      if (activity.modalidadOperacion === "ACCESO_LIBRE") throw new CatalogValidationError("La actividad es de acceso libre y no requiere inscripción.");
      if (["HORARIO_FIJO", "CURSO_PERIODO"].includes(activity.modalidadOperacion)) requestedScheduleIds = activity.horarios.map((item) => item.id);
      if (activity.modalidadOperacion === "TURNO_RECURRENTE" && !requestedScheduleIds.length) throw new CatalogValidationError("Seleccioná al menos un turno recurrente.");
      if (["TURNO_PUNTUAL", "EVENTO_UNICO"].includes(activity.modalidadOperacion) && !classId) throw new CatalogValidationError("Seleccioná una clase concreta para esta modalidad.");
      if (!requestedScheduleIds.length) throw new CatalogValidationError("La actividad no tiene horarios activos.");
      const validIds = new Set(activity.horarios.map((item) => item.id));
      if (requestedScheduleIds.some((id) => !validIds.has(id))) throw new CatalogValidationError("Uno de los horarios no pertenece a la actividad seleccionada.");
    }
    requestedScheduleIds = [...new Set(requestedScheduleIds)];
    if (!requestedScheduleIds.length) throw new CatalogValidationError("Seleccioná una actividad y sus horarios.");
    const schedules = await Promise.all(requestedScheduleIds.map((id) => lockSchedule(tx, id)));
    const schedule = schedules[0];
    if (schedules.some((item) => item.actividad.id !== schedule.actividad.id)) throw new CatalogValidationError("Todos los horarios deben pertenecer a la misma actividad.");
    for(const slot of requestedSlots){const source=schedules.find(item=>item.id===slot.horarioActividadId);if(!source)throw new CatalogValidationError("El turno seleccionado no pertenece a la actividad.");const start=Number(slot.horaInicio.slice(0,2))*60+Number(slot.horaInicio.slice(3)),end=Number(slot.horaFin.slice(0,2))*60+Number(slot.horaFin.slice(3)),rangeStart=Number(source.horaInicio.slice(0,2))*60+Number(source.horaInicio.slice(3)),rangeEnd=Number(source.horaFin.slice(0,2))*60+Number(source.horaFin.slice(3));if(start<rangeStart||end>rangeEnd||start>=end||(source.duracionTurnoMinutos&&end-start!==source.duracionTurnoMinutos))throw new CatalogValidationError("Uno de los turnos no coincide con la franja configurada.");}
    if(schedule.actividad.modalidadInscripcion!=="POR_CLASE"){const scopes=requestedSlots.length?requestedSlots.map(slot=>{const source=schedules.find(item=>item.id===slot.horarioActividadId)!;return{day:source.diaSemana,startTime:slot.horaInicio,endTime:slot.horaFin};}):schedules.map(item=>({day:item.diaSemana,startTime:item.horaInicio,endTime:item.horaFin}));await assertNoRecurringOverlap(tx,input.usuarioId,schedule.actividad.id,scopes);}
    if (!["ACTIVA", "SIN_CUPO", "COMPLETA"].includes(schedule.actividad.estado)) {
      throw new CatalogValidationError("La actividad no admite nuevas inscripciones.");
    }
    assertEnrollmentAge({
      birthDate: user.fechaNacimiento,
      gender: user.genero,
      referenceDate: new Date(),
      audiences: schedule.actividad.publicosObjetivo.map((item) => item.publicoObjetivo),
    });
    const documentsApproved = await hasApprovedRequiredDocuments(tx, input.usuarioId, schedule.actividad.requisitos.map((item) => item.requisitoId));
    let state: "PENDIENTE" | "CONFIRMADA" | "LISTA_ESPERA" = "PENDIENTE";
    if (documentsApproved) {
      if (schedule.actividad.modalidadInscripcion === "POR_CLASE") state = "CONFIRMADA";
      else {
        const states = await Promise.all((requestedSlots.length?requestedSlots:schedules.map(item=>({horarioActividadId:item.id,horaInicio:null,horaFin:null}))).map((slot) => nextState(tx, schedules.find(item=>item.id===slot.horarioActividadId)!, {horaInicio:slot.horaInicio})));
        state = states.every((item) => item === "CONFIRMADA") ? "CONFIRMADA" : "LISTA_ESPERA";
      }
    }
    const now = new Date();
    const existing = await tx.inscripcion.findFirst({ where: { usuarioId: input.usuarioId, horarioActividad: { actividadId: schedule.actividad.id } }, orderBy: { createdAt: "desc" }, include });
    const expiredPeriod = existing?.modalidad === "POR_PERIODO" && existing.fechaFin && existing.fechaFin < now;
    if (existing && !expiredPeriod && !["CANCELADA", "RECHAZADA", "BAJA"].includes(existing.estado)) throw new CatalogConflictError("El usuario ya posee una inscripción para este horario.");
    const periodEnd = input.fechaFin ?? (schedule.actividad.modalidadInscripcion === "POR_PERIODO" ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + (schedule.actividad.duracionPeriodoMeses ?? 1), now.getUTCDate())) : null);
    const data = { estado: state, fechaInscripcion: now, fechaConfirmacion: state === "CONFIRMADA" ? now : null, fechaListaEspera: state === "LISTA_ESPERA" ? now : null, fechaCancelacion: null, motivoRechazo: null, motivoCancelacion: null, observaciones: clean(input.observaciones), nivelInformado: schedule.actividad.nivel, nivelConsentidoAt: input.nivelConsentido ? now : null, modalidad: schedule.actividad.modalidadInscripcion, fechaInicio: now, fechaFin: periodEnd };
    const scopeData = requestedSlots.length ? requestedSlots : requestedScheduleIds.map((horarioActividadId) => ({ horarioActividadId, horaInicio:null, horaFin:null }));
    const row = existing ? await tx.inscripcion.update({ where: { id: existing.id }, data: { ...data, horarioActividadId: schedule.id, horarios: { deleteMany: {}, create: scopeData } }, include }) : await tx.inscripcion.create({ data: { usuarioId: input.usuarioId, horarioActividadId: schedule.id, ...data, horarios: { create: scopeData } }, include });
    if (classId && state === "CONFIRMADA") await tx.reservaClase.upsert({ where: { claseActividadId_usuarioId: { claseActividadId: classId, usuarioId: input.usuarioId } }, create: { claseActividadId: classId, usuarioId: input.usuarioId, inscripcionId: row.id, estado: "RESERVADA", confirmadoAt: now }, update: { inscripcionId: row.id, estado: "RESERVADA", confirmadoAt: now, canceladoAt: null, motivoCancelacion: null } });
    await createNotification({ userId: row.usuarioId, type: state === "CONFIRMADA" ? "INSCRIPCION_CONFIRMADA" : state === "LISTA_ESPERA" ? "LISTA_ESPERA" : "GENERAL", title: state === "CONFIRMADA" ? "Inscripción confirmada" : state === "LISTA_ESPERA" ? "Lista de espera" : "Inscripción pendiente", message: state === "CONFIRMADA" ? `Tu inscripción a ${row.horarioActividad.actividad.nombre}, ${row.horarioActividad.diaSemana.toLowerCase()} a las ${row.horarioActividad.horaInicio}, fue confirmada.` : state === "LISTA_ESPERA" ? `Ingresaste a la lista de espera de ${row.horarioActividad.actividad.nombre}.` : `Tu inscripción a ${row.horarioActividad.actividad.nombre} quedó pendiente hasta que completes y se apruebe la documentación obligatoria.`, priority: state === "PENDIENTE" ? "ALTA" : "NORMAL", actionUrl: state === "PENDIENTE" ? "/citizen/documents" : "/citizen/enrollments", actionLabel: state === "PENDIENTE" ? "Completar documentación" : "Ver inscripción", entityType: "enrollment", entityId: row.id, deduplicationKey: `enrollment-${state.toLowerCase()}:${row.id}:${row.updatedAt.getTime()}` }, tx);
    if(state==="PENDIENTE"){const citizenName=[row.usuario.nombre,row.usuario.apellido].filter(Boolean).join(" ")||row.usuario.documento||"Un ciudadano";await notifyAdministrators({type:"GENERAL",title:"Inscripción pendiente de documentación",message:`${citizenName} se inscribió a ${row.horarioActividad.actividad.nombre}, pero todavía no tiene aprobada toda la documentación obligatoria.`,priority:"ALTA",actionUrl:"/enrollments?status=PENDIENTE",actionLabel:"Revisar inscripciones",entityType:"enrollment",entityId:row.id,deduplicationKey:`admin-enrollment-pending:${row.id}:${row.updatedAt.getTime()}`},tx)}
    return map(tx, row);
  });
}
export async function getEnrollmentSlotAvailability(selections:Array<{horarioActividadId:string;horaInicio:string;horaFin:string}>,userId?:string,activityId?:string){return prisma.$transaction(async tx=>{const ids=[...new Set(selections.map(item=>item.horarioActividadId))],schedules=await tx.horarioActividad.findMany({where:{id:{in:ids}},include:{actividad:true}});if(schedules.length!==ids.length)throw new CatalogNotFoundError("Uno de los horarios no existe.");if(userId&&activityId){const scopes=selections.map(selection=>{const schedule=schedules.find(item=>item.id===selection.horarioActividadId)!;return{day:schedule.diaSemana,startTime:selection.horaInicio,endTime:selection.horaFin};});await assertNoRecurringOverlap(tx,userId,activityId,scopes);}return Promise.all(selections.map(async selection=>{const schedule=schedules.find(item=>item.id===selection.horarioActividadId)!;const result=await capacity(tx,schedule,{horaInicio:selection.horaInicio});return{...selection,available:result.availableCount,status:result.availableCount>0?"DISPONIBLE":schedule.permiteListaEspera?"LISTA_ESPERA":"SIN_CUPO"};}));});}
export async function promoteDocumentReadyEnrollments(tx:Prisma.TransactionClient,userId:string){
  const pending=await tx.inscripcion.findMany({where:{usuarioId:userId,estado:"PENDIENTE"},select:{id:true,horarioActividadId:true}}),promoted=[];
  for(const enrollment of pending){
    const schedule=await lockSchedule(tx,enrollment.horarioActividadId),ready=await hasApprovedRequiredDocuments(tx,userId,schedule.actividad.requisitos.map(item=>item.requisitoId));
    if(!ready)continue;
    let state:"CONFIRMADA"|"LISTA_ESPERA";
    try{state=schedule.actividad.modalidadInscripcion==="POR_CLASE"?"CONFIRMADA":await nextState(tx,schedule)}catch(error){if(error instanceof CatalogConflictError)continue;throw error}
    const now=new Date(),periodEnd=schedule.actividad.modalidadInscripcion==="POR_PERIODO"?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+(schedule.actividad.duracionPeriodoMeses??1),now.getUTCDate())):null,row=await tx.inscripcion.update({where:{id:enrollment.id},data:{estado:state,modalidad:schedule.actividad.modalidadInscripcion,fechaInicio:now,fechaFin:periodEnd,fechaConfirmacion:state==="CONFIRMADA"?now:null,fechaListaEspera:state==="LISTA_ESPERA"?now:null},include});
    await createNotification({userId,title:state==="CONFIRMADA"?"Inscripción confirmada":"Lista de espera",type:state==="CONFIRMADA"?"INSCRIPCION_CONFIRMADA":"LISTA_ESPERA",message:state==="CONFIRMADA"?`Tu documentación fue aprobada y la inscripción a ${row.horarioActividad.actividad.nombre} quedó confirmada.`:`Tu documentación fue aprobada y pasaste a la lista de espera de ${row.horarioActividad.actividad.nombre}.`,actionUrl:state==="CONFIRMADA"&&schedule.actividad.modalidadInscripcion==="POR_CLASE"?"/citizen/schedule":"/citizen/enrollments",actionLabel:state==="CONFIRMADA"&&schedule.actividad.modalidadInscripcion==="POR_CLASE"?"Elegir clases":"Ver inscripción",entityType:"enrollment",entityId:row.id,deduplicationKey:`enrollment-documents-ready:${row.id}:${row.updatedAt.getTime()}`},tx);promoted.push(row.id)
  }
  return promoted
}
async function promote(tx:Prisma.TransactionClient,scheduleId:string){const schedule=await lockSchedule(tx,scheduleId);const cap=await capacity(tx,schedule);if(cap.availableCount<=0)return;const waiting=await tx.inscripcion.findFirst({where:{horarioActividadId:scheduleId,estado:"LISTA_ESPERA"},include:{usuario:{select:{fechaNacimiento:true}}},orderBy:[{fechaListaEspera:"asc"},{createdAt:"asc"}]});if(waiting){const ageResult=evaluateEnrollmentAge({birthDate:waiting.usuario.fechaNacimiento,referenceDate:new Date(),audiences:schedule.actividad.publicosObjetivo.map((item)=>item.publicoObjetivo)});if(!ageResult.eligible)return;const promoted=await tx.inscripcion.update({where:{id:waiting.id},data:{estado:"CONFIRMADA",fechaConfirmacion:new Date()},include});await createNotification({userId:promoted.usuarioId,type:"PROMOCION_LISTA_ESPERA",title:"Lugar confirmado",message:`Se liberó un lugar y tu inscripción a ${promoted.horarioActividad.actividad.nombre} fue confirmada.`,priority:"NORMAL",actionUrl:"/citizen/enrollments",actionLabel:"Ver inscripción",entityType:"enrollment",entityId:promoted.id,deduplicationKey:`waitlist-promoted:${promoted.id}:${promoted.updatedAt.getTime()}`},tx);}}
export async function updateEnrollment(id: string, input: UpdateEnrollmentInput) {
  return serializable(async (tx) => {
    const current = await tx.inscripcion.findUnique({ where: { id }, include });
    if (!current) throw new CatalogNotFoundError("Inscripción no encontrada.");
    const target = (input.estado ?? current.estado) as InscripcionEstado;
    const reactivating = current.estado === "BAJA" && target === "CONFIRMADA";
    if (input.estado && input.estado !== current.estado && !transitions[current.estado].includes(target)) throw new CatalogValidationError("La transición de estado no está permitida.");
    if (target === "RECHAZADA" && !clean(input.motivoRechazo)) throw new CatalogValidationError("Indicá el motivo del rechazo.");
    if (reactivating && !clean(input.motivoCancelacion)) throw new CatalogValidationError("Indicá el motivo de la reactivación.");

    if (["CONFIRMADA", "LISTA_ESPERA"].includes(target) && target !== current.estado) {
      const scheduleIds = [...new Set(current.horarios.length ? current.horarios.map((item) => item.horarioActividadId) : [current.horarioActividadId])];
      const schedules = await Promise.all(scheduleIds.map((scheduleId) => lockSchedule(tx, scheduleId)));
      const schedule = schedules[0];
      const user = await tx.usuario.findUnique({ where: { id: current.usuarioId }, select: { fechaNacimiento: true, genero: true, estadoParticipacion: true } });
      if (!user) throw new CatalogValidationError("El usuario no existe o fue eliminado.");
      if (user.estadoParticipacion !== "HABILITADO") throw new CatalogValidationError("La participación del ciudadano está en revisión administrativa.");
      if (!["ACTIVA", "SIN_CUPO", "COMPLETA"].includes(schedule.actividad.estado)) throw new CatalogValidationError("La actividad no admite reactivar inscripciones.");
      assertEnrollmentAge({ birthDate: user.fechaNacimiento, gender: user.genero, referenceDate: new Date(), audiences: schedule.actividad.publicosObjetivo.map((item) => item.publicoObjetivo) });
      const documentsApproved = await hasApprovedRequiredDocuments(tx, current.usuarioId, schedule.actividad.requisitos.map((item) => item.requisitoId));
      if (!documentsApproved) throw new CatalogValidationError("No se puede reactivar: falta documentación obligatoria aprobada.");
      if (schedule.actividad.modalidadInscripcion !== "POR_CLASE") {
        const scopes = current.horarios.length ? current.horarios.map((item) => ({ day: item.horarioActividad.diaSemana, startTime: item.horaInicio ?? item.horarioActividad.horaInicio, endTime: item.horaFin ?? item.horarioActividad.horaFin })) : [{ day: schedule.diaSemana, startTime: schedule.horaInicio, endTime: schedule.horaFin }];
        await assertNoRecurringOverlap(tx, current.usuarioId, schedule.actividad.id, scopes);
      }
      const states = await Promise.all(schedules.map((item) => {
        const selectedSlot = current.horarios.find((entry) => entry.horarioActividadId === item.id);
        return nextState(tx, item, { horaInicio: selectedSlot?.horaInicio ?? null });
      }));
      if (target === "CONFIRMADA" && states.some((state) => state !== "CONFIRMADA")) throw new CatalogConflictError("No hay capacidad para reactivar la inscripción en todos sus horarios.");
    }

    const released = current.estado === "CONFIRMADA" && ["CANCELADA", "BAJA", "RECHAZADA"].includes(target);
    const now = new Date();
    const reactivationReason = clean(input.motivoCancelacion);
    const observations = reactivating ? [current.observaciones, `Reactivación: ${reactivationReason}`].filter(Boolean).join("\n") : input.observaciones === undefined ? undefined : clean(input.observaciones);
    const row = await tx.inscripcion.update({ where: { id }, data: { observaciones: observations, estado: target, motivoRechazo: target === "RECHAZADA" ? clean(input.motivoRechazo) : null, motivoCancelacion: ["CANCELADA", "BAJA"].includes(target) ? clean(input.motivoCancelacion) : null, fechaConfirmacion: target === "CONFIRMADA" ? now : current.fechaConfirmacion, fechaListaEspera: target === "LISTA_ESPERA" ? (current.fechaListaEspera ?? now) : current.fechaListaEspera, fechaCancelacion: target === "CANCELADA" ? now : null }, include });
    if (released) await promote(tx, current.horarioActividadId);
    if (reactivating) await createNotification({ userId: row.usuarioId, type: "GENERAL", title: "Inscripción reactivada", message: `Administración reactivó tu inscripción a ${row.horarioActividad.actividad.nombre}.`, priority: "NORMAL", actionUrl: "/citizen/enrollments", actionLabel: "Ver inscripción", entityType: "enrollment", entityId: row.id, deduplicationKey: `enrollment-reactivated:${row.id}:${row.updatedAt.getTime()}` }, tx);
    if (input.estado && input.estado !== current.estado && ["CANCELADA", "RECHAZADA", "BAJA"].includes(target)) {
      const config = target === "CANCELADA" ? { type: "INSCRIPCION_CANCELADA" as const, title: "Inscripción cancelada", priority: "NORMAL" as const } : target === "RECHAZADA" ? { type: "INSCRIPCION_RECHAZADA" as const, title: "Inscripción rechazada", priority: "ALTA" as const } : { type: "INSCRIPCION_BAJA" as const, title: "Inscripción dada de baja", priority: "ALTA" as const };
      await createNotification({ userId: row.usuarioId, type: config.type, title: config.title, message: `Tu inscripción a ${row.horarioActividad.actividad.nombre} fue ${target === "BAJA" ? "dada de baja" : target.toLowerCase()}.`, priority: config.priority, actionUrl: "/citizen/enrollments", actionLabel: "Ver inscripción", entityType: "enrollment", entityId: row.id, deduplicationKey: `enrollment-${target.toLowerCase()}:${row.id}:${row.updatedAt.getTime()}` }, tx);
    }
    return map(tx, row);
  });
}
export const cancelEnrollment=(id:string,motivoCancelacion?:string)=>updateEnrollment(id,{estado:"CANCELADA",motivoCancelacion});
export async function getEnrollment(id:string){const item=await prisma.$transaction(async tx=>{const row=await tx.inscripcion.findUnique({where:{id},include});return row?map(tx,row):null;});if(!item)return null;const summaries=await getEnrollmentDocumentationSummaries([id]);return{...item,documentation:summaries.get(id)!};}
export async function listEnrollments(filters: EnrollmentFilters) {
  const f = filters as any;
  const search = f.search?.trim();
  const where: Prisma.InscripcionWhereInput = {
    estado: f.status,
    usuarioId: f.userId,
    horarioActividadId: f.activityScheduleId,
    fechaInscripcion: f.dateFrom || f.dateTo ? { gte: f.dateFrom, lte: f.dateTo } : undefined,
    horarioActividad: { actividadId: f.activityId, establecimientoId: f.establishmentId, diaSemana: f.day, profesores: f.professorId ? { some: { profesorId: f.professorId } } : undefined },
    ...(search ? { OR: [{ usuario: { nombre: { contains: search, mode: "insensitive" } } }, { usuario: { apellido: { contains: search, mode: "insensitive" } } }, { usuario: { documento: { contains: search, mode: "insensitive" } } }, { usuario: { email: { contains: search, mode: "insensitive" } } }, { horarioActividad: { actividad: { nombre: { contains: search, mode: "insensitive" } } } }, { horarioActividad: { establecimiento: { nombre: { contains: search, mode: "insensitive" } } } }] } : {}),
  };
  const orderBy: Prisma.InscripcionOrderByWithRelationInput = f.sortBy === "updatedAt" ? { updatedAt: f.sortDir } : f.sortBy === "status" ? { estado: f.sortDir } : { fechaInscripcion: f.sortDir };
  const result = await prisma.$transaction(async (tx) => {
    const [total, rows] = await Promise.all([tx.inscripcion.count({ where }), tx.inscripcion.findMany({ where, include, orderBy, skip: (f.page - 1) * f.pageSize, take: f.pageSize })]);
    return { items: await Promise.all(rows.map((row) => map(tx, row))), meta: { total, page: f.page, pageSize: f.pageSize, pageCount: Math.max(1, Math.ceil(total / f.pageSize)) } };
  });
  const summaries = await getEnrollmentDocumentationSummaries(result.items.map((item) => item.id));
  return { ...result, items: result.items.map((item) => ({ ...item, documentation: summaries.get(item.id)! })) };
}
