import { prisma } from "@/lib/db";
import { Genero, Nacionalidad, Prisma } from "@prisma/client";
import { generateActivitySessions } from "@/features/activity-sessions/services/activity-sessions.server";
import { createEnrollment, cancelEnrollment, changeCitizenEnrollmentSchedules } from "@/features/enrollments/services/enrollments.server";
import { getUserQrStatus } from "@/features/attendance-qr/services/qr-credentials.server";
import { getDigitalAccessQrStatus, issueDigitalAccessQr, revokeDigitalAccessQr } from "@/features/access/services/digital-access-qr.server";
import { CatalogConflictError, CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { notifyAdministrators } from "@/features/notifications/services/notifications.server";
import { isCanceledCitizenSessionVisible, resolveCitizenScheduleStatus } from "../helpers/citizen-schedule-status";
import { evaluateEnrollmentAge } from "@/features/enrollments/helpers/enrollment-age";
const dateText=(v:Date)=>v.toISOString().slice(0,10);
export async function getCitizenSummary(userId:string){const[user,grouped,upcoming,attended,qr]=await Promise.all([prisma.usuario.findFirst({where:{id:userId,deletedAt:null},select:{id:true,nombre:true,apellido:true,avatarUrl:true}}),prisma.inscripcion.groupBy({by:["estado"],where:{usuarioId:userId},_count:{_all:true}}),listCitizenSchedule(userId,{limit:1,upcomingOnly:true,enrollmentStatuses:["CONFIRMADA"]}),prisma.asistencia.count({where:{inscripcion:{usuarioId:userId},estado:"PRESENTE"}}),getUserQrStatus(userId)]);if(!user)throw new CatalogNotFoundError("Usuario no encontrado.");const count=(state:string)=>grouped.find(x=>x.estado===state)?._count._all??0;return{user:{id:user.id,firstName:user.nombre,lastName:user.apellido,avatarUrl:user.avatarUrl},counts:{confirmedEnrollments:count("CONFIRMADA"),waitlistEnrollments:count("LISTA_ESPERA"),upcomingSessions:upcoming.total,attendedSessions:attended},nextSession:upcoming.items[0]??null,qrCredential:qr}}
export async function listCitizenActivities(userId:string,search?:string){const[user,rows]=await Promise.all([prisma.usuario.findFirst({where:{id:userId,deletedAt:null},select:{fechaNacimiento:true}}),prisma.actividad.findMany({where:{estado:{in:["ACTIVA","SIN_CUPO","COMPLETA"]},...(search?{OR:[{nombre:{contains:search,mode:"insensitive"}},{descripcionCorta:{contains:search,mode:"insensitive"}}]}:{})},include:{establecimiento:{select:{id:true,nombre:true}},categoriaActividad:{select:{nombre:true}},publicosObjetivo:{include:{publicoObjetivo:{select:{nombre:true,edadMinimaSugerida:true,edadMaximaSugerida:true}}}},requisitos:{include:{requisito:true},orderBy:{orden:"asc"}},horarios:{where:{estado:"ACTIVO"},include:{establecimiento:{select:{id:true,nombre:true}},profesores:{include:{profesor:{include:{usuario:{select:{nombre:true,apellido:true}}}}},orderBy:[{esPrincipal:"desc"},{createdAt:"asc"}]},inscripciones:{where:{estado:"CONFIRMADA",modalidad:{not:"POR_CLASE"}},select:{id:true}}}}},orderBy:{nombre:"asc"}})]);if(!user)throw new CatalogNotFoundError("Usuario no encontrado.");const own=await prisma.inscripcion.findMany({where:{usuarioId:userId},select:{id:true,horarioActividadId:true,estado:true,horarios:{select:{horarioActividadId:true,horaInicio:true,horaFin:true}}}}),ownMap=new Map(own.flatMap(x=>x.horarios.length?x.horarios.map(slot=>[slot.horarioActividadId,x.estado] as const):[[x.horarioActividadId,x.estado] as const])),ownEnrollmentIdMap=new Map(own.flatMap(x=>x.horarios.length?x.horarios.map(slot=>[slot.horarioActividadId,x.id] as const):[[x.horarioActividadId,x.id] as const])),ownSlotsMap=new Map<string,Array<{startTime:string|null;endTime:string|null;status:string}>>();for(const enrollment of own){for(const slot of enrollment.horarios){ownSlotsMap.set(slot.horarioActividadId,[...(ownSlotsMap.get(slot.horarioActividadId)??[]),{startTime:slot.horaInicio,endTime:slot.horaFin,status:enrollment.estado}])}}return rows.filter(a=>evaluateEnrollmentAge({birthDate:user.fechaNacimiento,referenceDate:new Date(),audiences:a.publicosObjetivo.map(x=>x.publicoObjetivo)}).eligible).map(a=>({id:a.id,name:a.nombre,shortDescription:a.descripcionCorta,imageUrl:a.imagenUrl,category:a.categoriaActividad?.nombre??a.categoria,level:a.nivel,enrollmentMode:a.modalidadInscripcion,periodMonths:a.duracionPeriodoMeses,cancellationNoticeHours:a.horasCancelacionJustificada,age:{min:a.edadMinima,max:a.edadMaxima},free:a.esGratuita,price:a.precio?.toString()??null,establishment:a.establecimiento,audiences:a.publicosObjetivo.map(x=>x.publicoObjetivo.nombre),requirements:a.requisitos.map(x=>({id:x.requisito.id,name:x.requisito.nombre,imageUrl:x.requisito.imagenUrl,slug:x.requisito.slug,type:x.requisito.tipo,requiresDocument:x.requisito.requiereDocumento,mandatory:x.obligatorio,observations:x.observaciones,instructions:x.requisito.instrucciones,order:x.orden,active:x.requisito.activo})),hasRequirements:a.requisitos.length>0,requiresDocumentation:a.requisitos.some(x=>x.obligatorio&&x.requisito.requiereDocumento),schedules:a.horarios.map(h=>({id:h.id,day:h.diaSemana,startTime:h.horaInicio,endTime:h.horaFin,slotDurationMinutes:h.duracionTurnoMinutos,slotGapMinutes:h.intervaloTurnoMinutos,space:h.espacio,establishment:{id:h.establecimiento.id,name:h.establecimiento.nombre},maxCapacity:h.cupoMaximo,confirmedCount:h.inscripciones.length,availableCount:a.modalidadInscripcion==="POR_CLASE"?h.cupoMaximo:Math.max(h.cupoMaximo+(h.permiteSobrecupo?h.sobrecupoMaximo??0:0)-h.inscripciones.length,0),waitlistEnabled:h.permiteListaEspera,professors:h.profesores.map(p=>[p.profesor.usuario.nombre,p.profesor.usuario.apellido].filter(Boolean).join(" ")),ownEnrollmentStatus:ownMap.get(h.id)??null,ownEnrollmentId:ownEnrollmentIdMap.get(h.id)??null,ownEnrollmentSlots:ownSlotsMap.get(h.id)??[]}))}))}
export async function getCitizenActivity(userId:string,id:string){const item=(await listCitizenActivities(userId)).find(x=>x.id===id);if(!item)throw new CatalogNotFoundError("Actividad no disponible.");const full=await prisma.actividad.findUnique({where:{id},select:{descripcion:true,modalidadOperacion:true,horarios:{where:{estado:"ACTIVO"},select:{clases:{where:{fecha:{gte:new Date()},estado:{in:["PROGRAMADA","EN_CURSO"]}},select:{id:true,fecha:true,horaInicio:true,horaFin:true,estado:true},orderBy:[{fecha:"asc"},{horaInicio:"asc"}]}}}}});return{...item,descripcion:full?.descripcion??null,modalidadOperacion:full?.modalidadOperacion??"TURNO_RECURRENTE",eventSessions:full?.horarios.flatMap(h=>h.clases.map(session=>({...session,date:dateText(session.fecha)})))??[]}}
export async function createCitizenEnrollment(userId:string,input:{activityId?:string;activityScheduleId?:string;selectedSlots?:Array<{activityScheduleId:string;startTime:string;endTime:string}>;levelConsent:boolean}){
  if(input.activityId&&input.selectedSlots?.length){
    const existing=await prisma.inscripcion.findFirst({where:{usuarioId:userId,estado:{in:["PENDIENTE","CONFIRMADA","LISTA_ESPERA"]},horarioActividad:{actividadId:input.activityId}},orderBy:{createdAt:"desc"},select:{id:true,horarioActividadId:true,horarios:{select:{horarioActividadId:true,horaInicio:true,horaFin:true,horarioActividad:{select:{horaInicio:true,horaFin:true}}}},horarioActividad:{select:{horaInicio:true,horaFin:true,actividad:{select:{modalidadOperacion:true}}}}}});
    if(existing?.horarioActividad.actividad.modalidadOperacion==="TURNO_RECURRENTE"){
      const current=existing.horarios.length?existing.horarios.map(item=>({activityScheduleId:item.horarioActividadId,startTime:item.horaInicio??item.horarioActividad.horaInicio,endTime:item.horaFin??item.horarioActividad.horaFin})):[{activityScheduleId:existing.horarioActividadId,startTime:existing.horarioActividad.horaInicio,endTime:existing.horarioActividad.horaFin}];
      const merged=new Map([...current,...input.selectedSlots].map(item=>[`${item.activityScheduleId}-${item.startTime}-${item.endTime}`,item]));
      if(merged.size===current.length)throw new CatalogValidationError("Ya estás inscripto en los horarios seleccionados.");
      return changeCitizenEnrollmentSchedules(userId,existing.id,[...merged.values()].map(item=>({horarioActividadId:item.activityScheduleId,horaInicio:item.startTime,horaFin:item.endTime})));
    }
  }
  return createEnrollment({usuarioId:userId,actividadId:input.activityId,horarioActividadId:input.activityScheduleId,horariosSeleccionados:input.selectedSlots?.map(slot=>({horarioActividadId:slot.activityScheduleId,horaInicio:slot.startTime,horaFin:slot.endTime})),nivelConsentido:input.levelConsent},{notifyAdmin:true});
}
export async function listCitizenEnrollments(userId:string){const rows=await prisma.inscripcion.findMany({where:{usuarioId:userId},include:{horarioActividad:{include:{actividad:{select:{id:true,nombre:true,modalidadOperacion:true,imagenUrl:true}},establecimiento:{select:{id:true,nombre:true}},clases:{where:{fecha:{gte:new Date()}},orderBy:{fecha:"asc"},take:1}}},horarios:{include:{horarioActividad:{include:{establecimiento:{select:{id:true,nombre:true}}}}}}},orderBy:{fechaInscripcion:"desc"}});return Promise.all(rows.map(async x=>({id:x.id,status:x.estado,enrollmentDate:x.fechaInscripcion,waitlistPosition:x.estado==="LISTA_ESPERA"?await prisma.inscripcion.count({where:{horarioActividadId:x.horarioActividadId,estado:"LISTA_ESPERA",fechaListaEspera:{lte:x.fechaListaEspera??x.createdAt}}}):null,schedule:{id:x.horarioActividad.id,day:x.horarioActividad.diaSemana,startTime:x.horarioActividad.horaInicio,endTime:x.horarioActividad.horaFin,activity:{id:x.horarioActividad.actividad.id,nombre:x.horarioActividad.actividad.nombre,modalidadOperacion:x.horarioActividad.actividad.modalidadOperacion,imageUrl:x.horarioActividad.actividad.imagenUrl},establishment:x.horarioActividad.establecimiento},selectedSchedules:(x.horarios.length?x.horarios.map(item=>({id:item.horarioActividadId,day:item.horarioActividad.diaSemana,startTime:item.horaInicio??item.horarioActividad.horaInicio,endTime:item.horaFin??item.horarioActividad.horaFin,establishment:item.horarioActividad.establecimiento})):[{id:x.horarioActividad.id,day:x.horarioActividad.diaSemana,startTime:x.horarioActividad.horaInicio,endTime:x.horarioActividad.horaFin,establishment:x.horarioActividad.establecimiento}]),nextSession:x.horarioActividad.clases[0]?{id:x.horarioActividad.clases[0].id,date:dateText(x.horarioActividad.clases[0].fecha)}:null})))}
export async function cancelCitizenEnrollment(userId:string,id:string,reason?:string){const own=await prisma.inscripcion.findFirst({where:{id,usuarioId:userId},select:{id:true,estado:true}});if(!own)throw new CatalogNotFoundError("Inscripción no encontrada.");if(!["CONFIRMADA","LISTA_ESPERA","PENDIENTE"].includes(own.estado))throw new CatalogValidationError("La inscripción no puede cancelarse.");return cancelEnrollment(id,reason)}
export const updateCitizenEnrollmentSchedules=(userId:string,id:string,selections:Array<{activityScheduleId:string;startTime:string;endTime:string}>)=>changeCitizenEnrollmentSchedules(userId,id,selections.map(item=>({horarioActividadId:item.activityScheduleId,horaInicio:item.startTime,horaFin:item.endTime})));
type CitizenScheduleEnrollmentStatus = "CONFIRMADA" | "PENDIENTE" | "LISTA_ESPERA" | "CANCELADA";
type CitizenScheduleOptions = {
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  upcomingOnly?: boolean;
  enrollmentStatuses?: CitizenScheduleEnrollmentStatus[];
};

export async function ensureCitizenSchedule(userId:string,dateFrom:string,dateTo:string){
  const schedules=await prisma.inscripcion.findMany({
    where:{
      usuarioId:userId,
      estado:{in:["CONFIRMADA","PENDIENTE","LISTA_ESPERA"]},
      horarioActividad:{estado:{notIn:["CANCELADO","FINALIZADO"]}},
    },
    select:{horarioActividadId:true,horarios:{select:{horarioActividadId:true}}},
  });
  const scheduleIds=[...new Set(schedules.flatMap(item=>item.horarios.length?item.horarios.map(scope=>scope.horarioActividadId):[item.horarioActividadId]))];
  let createdCount=0;
  let skippedCount=0;
  for(const horarioActividadId of scheduleIds){
    try{
      const result=await generateActivitySessions({activityScheduleId:horarioActividadId,dateFrom,dateTo,excludedDates:[]});
      createdCount+=result.createdDates.length;
    }catch(error){
      const recoverable=error instanceof CatalogConflictError||error instanceof CatalogValidationError||error instanceof CatalogNotFoundError||(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002");
      if(!recoverable)throw error;
      skippedCount+=1;
    }
  }
  return{scheduleCount:scheduleIds.length,createdCount,skippedCount};
}

export async function listCitizenSchedule(userId:string,options:CitizenScheduleOptions={}){
  const enrollmentStatuses=options.enrollmentStatuses??["CONFIRMADA","PENDIENTE","LISTA_ESPERA","CANCELADA"];
  const dateFilter=options.dateFrom&&options.dateTo
    ? {gte:options.dateFrom,lte:options.dateTo}
    : options.upcomingOnly?{gte:new Date()}:undefined;
  const enrollments=await prisma.inscripcion.findMany({
    where:{usuarioId:userId,estado:{in:enrollmentStatuses}},
    orderBy:{createdAt:"desc"},
    select:{id:true,estado:true,fechaCancelacion:true,horarioActividadId:true,horarios:{select:{horarioActividadId:true,horaInicio:true,horaFin:true}}},
  });
  type EnrollmentScope={enrollment:(typeof enrollments)[number];startTime:string|null;endTime:string|null};
  const scopesBySchedule=new Map<string,EnrollmentScope[]>();
  for(const enrollment of enrollments){
    const scopes=enrollment.horarios.length?enrollment.horarios.map(item=>({scheduleId:item.horarioActividadId,startTime:item.horaInicio,endTime:item.horaFin})):[{scheduleId:enrollment.horarioActividadId,startTime:null,endTime:null}];
    for(const scope of scopes)scopesBySchedule.set(scope.scheduleId,[...(scopesBySchedule.get(scope.scheduleId)??[]),{enrollment,startTime:scope.startTime,endTime:scope.endTime}]);
  }
  const enrolledScheduleIds=[...scopesBySchedule.keys()];
  if(!enrolledScheduleIds.length)return{total:0,items:[]};
  const scheduleScopeFilters=[...scopesBySchedule.entries()].flatMap(([scheduleId,scopes])=>scopes.map(scope=>({horarioActividadId:scheduleId,...(scope.startTime?{horaInicio:scope.startTime}:{}),...(scope.endTime?{horaFin:scope.endTime}:{})})));
  const where={
    ...(dateFilter?{fecha:dateFilter}:{}),
    OR:scheduleScopeFilters,
  };
  const rows=await prisma.claseActividad.findMany({
    where,
    select:{
      id:true,fecha:true,horaInicio:true,horaFin:true,estado:true,espacio:true,cupoMaximo:true,asistenciaCerradaAt:true,horarioActividadId:true,
      horarioActividad:{select:{
        cupoMaximo:true,
        actividad:{select:{id:true,nombre:true,imagenUrl:true,modalidadInscripcion:true,horasCancelacionJustificada:true}},
        profesores:{where:{esPrincipal:true},select:{profesor:{select:{usuario:{select:{nombre:true,apellido:true}}}}},take:1},
      }},
      establecimiento:{select:{id:true,nombre:true}},
      profesores:{where:{esPrincipal:true},select:{profesor:{select:{usuario:{select:{nombre:true,apellido:true}}}}},take:1},
      asistencias:{where:{inscripcion:{usuarioId:userId}},select:{estado:true},take:1},
      reservas:{where:{usuarioId:userId},select:{id:true,estado:true,cancelacionJustificada:true,motivoCancelacion:true,ofertaVenceAt:true},take:1},
      _count:{select:{reservas:{where:{estado:"RESERVADA"}}}},
    },
    orderBy:[{fecha:"asc"},{horaInicio:"asc"}],
    ...(options.limit?{take:options.limit}:{}),
  });
  const enrollmentForRow=(row:(typeof rows)[number])=>scopesBySchedule.get(row.horarioActividadId)?.find(scope=>(!scope.startTime||scope.startTime===row.horaInicio)&&(!scope.endTime||scope.endTime===row.horaFin))?.enrollment;
  const visibleRows=rows.filter(x=>{
    const enrollment=enrollmentForRow(x);
    if(!enrollment)return false;
    return enrollment.estado!=="CANCELADA"||isCanceledCitizenSessionVisible(dateText(x.fecha),x.horaInicio,enrollment.fechaCancelacion);
  });
  const total=options.limit?await prisma.claseActividad.count({where}):visibleRows.length;
  return{total,items:visibleRows.map(x=>{
    const enrollment=enrollmentForRow(x)!;
    const enrollmentStatus=enrollment.estado as CitizenScheduleEnrollmentStatus;
    const professor=x.profesores[0]?.profesor.usuario??x.horarioActividad.profesores[0]?.profesor.usuario;
    const sessionStatus=x.estado;
    const displayStatus=resolveCitizenScheduleStatus({
      date:dateText(x.fecha),startTime:x.horaInicio,endTime:x.horaFin,sessionStatus,enrollmentStatus,
      cancellationDate:enrollment.fechaCancelacion,
      attendanceStatus:x.asistencias[0]?.estado??null,attendanceClosedAt:x.asistenciaCerradaAt,
    });
    return{
      id:x.id,date:dateText(x.fecha),startTime:x.horaInicio,endTime:x.horaFin,
      sessionStatus,enrollmentStatus,displayStatus,
      space:x.espacio,
      activity:{id:x.horarioActividad.actividad.id,name:x.horarioActividad.actividad.nombre,imageUrl:x.horarioActividad.actividad.imagenUrl,enrollmentMode:x.horarioActividad.actividad.modalidadInscripcion,cancellationNoticeHours:x.horarioActividad.actividad.horasCancelacionJustificada},
      establishment:{id:x.establecimiento.id,name:x.establecimiento.nombre},
      primaryProfessor:professor?[professor.nombre,professor.apellido].filter(Boolean).join(" ")||null:null,
      reservation:x.reservas[0]?{id:x.reservas[0].id,status:x.reservas[0].estado,justified:x.reservas[0].cancelacionJustificada,reason:x.reservas[0].motivoCancelacion,offerExpiresAt:x.reservas[0].ofertaVenceAt}:null,
      capacity:x.cupoMaximo??x.horarioActividad.cupoMaximo,
      reservedCount:x._count.reservas,
    };
  })};
}
export async function listCitizenAttendance(userId:string){const rows=await prisma.asistencia.findMany({where:{inscripcion:{usuarioId:userId}},include:{claseActividad:{include:{horarioActividad:{include:{actividad:{select:{id:true,nombre:true}}}},establecimiento:{select:{id:true,nombre:true}}}}},orderBy:{claseActividad:{fecha:"desc"}}});return rows.map(x=>({id:x.id,status:x.estado,justificationReason:x.motivoJustificacion,date:dateText(x.claseActividad.fecha),startTime:x.claseActividad.horaInicio,endTime:x.claseActividad.horaFin,activity:x.claseActividad.horarioActividad.actividad,establishment:x.claseActividad.establecimiento}))}
const citizenProfileSelect={id:true,userId:true,nombre:true,apellido:true,documento:true,email:true,celular:true,domicilio:true,localidad:true,provincia:true,codigoPostal:true,domicilioPlaceId:true,domicilioLat:true,domicilioLng:true,fechaNacimiento:true,genero:true,nacionalidad:true,avatarUrl:true,fotoPerfilUrl:true,contactoEmergenciaNombre:true,contactoEmergenciaTelefono:true,coberturaMedicaId:true,numeroAfiliado:true,updatedAt:true,coberturaMedica:{select:{id:true,nombre:true,tipo:true}}} satisfies Prisma.UsuarioSelect;
export async function getCitizenProfile(userId:string){const user=await prisma.usuario.findFirst({where:{id:userId,deletedAt:null},select:citizenProfileSelect});if(!user)throw new CatalogNotFoundError("Usuario no encontrado.");return user}
export async function updateCitizenProfile(userId:string,input:{firstName:string;lastName:string;phone:string;address:string;locality:string;province:string;postalCode:string;addressPlaceId?:string|null;addressLat?:number|null;addressLng?:number|null;profilePhotoUrl?:string|null;birthDate:string;nationality:Nacionalidad;gender:Genero;emergencyContactName:string;emergencyContactPhone:string;medicalCoverageId?:string|null;affiliateNumber?:string}){return prisma.$transaction(async tx=>{const updated=await tx.usuario.update({where:{id:userId},data:{nombre:input.firstName.trim(),apellido:input.lastName.trim(),celular:input.phone.trim(),domicilio:input.address.trim(),localidad:input.locality.trim(),provincia:input.province.trim(),codigoPostal:input.postalCode.trim(),domicilioPlaceId:input.addressPlaceId??null,domicilioLat:input.addressLat??null,domicilioLng:input.addressLng??null,nacionalidad:input.nationality,genero:input.gender,contactoEmergenciaNombre:input.emergencyContactName.trim(),contactoEmergenciaTelefono:input.emergencyContactPhone.trim(),coberturaMedicaId:input.medicalCoverageId??null,numeroAfiliado:input.affiliateNumber?.trim()||null,...(input.profilePhotoUrl!==undefined?{fotoPerfilUrl:input.profilePhotoUrl}:{}),fechaNacimiento:new Date(`${input.birthDate}T00:00:00.000Z`)},select:citizenProfileSelect});const fullName=[updated.nombre,updated.apellido].filter(Boolean).join(" ")||updated.userId;await notifyAdministrators({senderId:userId,type:"GENERAL",title:"Datos de perfil actualizados",message:`${fullName} modificó información de su perfil.`,priority:"NORMAL",actionUrl:`/users/${updated.id}`,actionLabel:"Ver usuario",entityType:"user_profile",entityId:updated.id,deduplicationKey:`profile-updated:${updated.id}:${updated.updatedAt.getTime()}`},tx);return updated})}
export const getCitizenQr=(userId:string)=>getDigitalAccessQrStatus(userId);export const issueCitizenQr=(userId:string)=>issueDigitalAccessQr(userId);export const revokeCitizenQr=(userId:string)=>revokeDigitalAccessQr(userId);
