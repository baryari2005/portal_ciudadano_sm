import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { generateActivitySessions } from "@/features/activity-sessions/services/activity-sessions.server";
import { createEnrollment, cancelEnrollment } from "@/features/enrollments/services/enrollments.server";
import { getUserQrStatus } from "@/features/attendance-qr/services/qr-credentials.server";
import { getDigitalAccessQrStatus, issueDigitalAccessQr, revokeDigitalAccessQr } from "@/features/access/services/digital-access-qr.server";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { notifyAdministrators } from "@/features/notifications/services/notifications.server";
import { isCanceledCitizenSessionVisible, resolveCitizenScheduleStatus } from "../helpers/citizen-schedule-status";
import { evaluateEnrollmentAge } from "@/features/enrollments/helpers/enrollment-age";
const dateText=(v:Date)=>v.toISOString().slice(0,10);
export async function getCitizenSummary(userId:string){const[user,grouped,upcoming,attended,qr]=await Promise.all([prisma.usuario.findFirst({where:{id:userId,deletedAt:null},select:{id:true,nombre:true,apellido:true,avatarUrl:true}}),prisma.inscripcion.groupBy({by:["estado"],where:{usuarioId:userId},_count:{_all:true}}),listCitizenSchedule(userId,{limit:1,upcomingOnly:true,enrollmentStatuses:["CONFIRMADA"]}),prisma.asistencia.count({where:{inscripcion:{usuarioId:userId},estado:"PRESENTE"}}),getUserQrStatus(userId)]);if(!user)throw new CatalogNotFoundError("Usuario no encontrado.");const count=(state:string)=>grouped.find(x=>x.estado===state)?._count._all??0;return{user:{id:user.id,firstName:user.nombre,lastName:user.apellido,avatarUrl:user.avatarUrl},counts:{confirmedEnrollments:count("CONFIRMADA"),waitlistEnrollments:count("LISTA_ESPERA"),upcomingSessions:upcoming.total,attendedSessions:attended},nextSession:upcoming.items[0]??null,qrCredential:qr}}
export async function listCitizenActivities(userId:string,search?:string){const[user,rows]=await Promise.all([prisma.usuario.findFirst({where:{id:userId,deletedAt:null},select:{fechaNacimiento:true}}),prisma.actividad.findMany({where:{estado:{in:["ACTIVA","SIN_CUPO","COMPLETA"]},...(search?{OR:[{nombre:{contains:search,mode:"insensitive"}},{descripcionCorta:{contains:search,mode:"insensitive"}}]}:{})},include:{establecimiento:{select:{id:true,nombre:true}},categoriaActividad:{select:{nombre:true}},publicosObjetivo:{include:{publicoObjetivo:{select:{nombre:true,edadMinimaSugerida:true,edadMaximaSugerida:true}}}},requisitos:{include:{requisito:true},orderBy:{orden:"asc"}},horarios:{where:{estado:"ACTIVO"},include:{establecimiento:{select:{id:true,nombre:true}},profesores:{include:{profesor:{include:{usuario:{select:{nombre:true,apellido:true}}}}},orderBy:[{esPrincipal:"desc"},{createdAt:"asc"}]},inscripciones:{where:{estado:"CONFIRMADA",modalidad:{not:"POR_CLASE"}},select:{id:true}}}}},orderBy:{nombre:"asc"}})]);if(!user)throw new CatalogNotFoundError("Usuario no encontrado.");const own=await prisma.inscripcion.findMany({where:{usuarioId:userId},select:{horarioActividadId:true,estado:true}}),ownMap=new Map(own.map(x=>[x.horarioActividadId,x.estado]));return rows.filter(a=>evaluateEnrollmentAge({birthDate:user.fechaNacimiento,referenceDate:new Date(),audiences:a.publicosObjetivo.map(x=>x.publicoObjetivo)}).eligible).map(a=>({id:a.id,name:a.nombre,shortDescription:a.descripcionCorta,imageUrl:a.imagenUrl,category:a.categoriaActividad?.nombre??a.categoria,level:a.nivel,enrollmentMode:a.modalidadInscripcion,periodMonths:a.duracionPeriodoMeses,cancellationNoticeHours:a.horasCancelacionJustificada,age:{min:a.edadMinima,max:a.edadMaxima},free:a.esGratuita,price:a.precio?.toString()??null,establishment:a.establecimiento,audiences:a.publicosObjetivo.map(x=>x.publicoObjetivo.nombre),requirements:a.requisitos.map(x=>({id:x.requisito.id,name:x.requisito.nombre,slug:x.requisito.slug,type:x.requisito.tipo,requiresDocument:x.requisito.requiereDocumento,mandatory:x.obligatorio,observations:x.observaciones,instructions:x.requisito.instrucciones,order:x.orden,active:x.requisito.activo})),hasRequirements:a.requisitos.length>0,requiresDocumentation:a.requisitos.some(x=>x.obligatorio&&x.requisito.requiereDocumento),schedules:a.horarios.map(h=>({id:h.id,day:h.diaSemana,startTime:h.horaInicio,endTime:h.horaFin,space:h.espacio,establishment:{id:h.establecimiento.id,name:h.establecimiento.nombre},maxCapacity:h.cupoMaximo,confirmedCount:h.inscripciones.length,availableCount:a.modalidadInscripcion==="POR_CLASE"?h.cupoMaximo:Math.max(h.cupoMaximo+(h.permiteSobrecupo?h.sobrecupoMaximo??0:0)-h.inscripciones.length,0),waitlistEnabled:h.permiteListaEspera,professors:h.profesores.map(p=>[p.profesor.usuario.nombre,p.profesor.usuario.apellido].filter(Boolean).join(" ")),ownEnrollmentStatus:ownMap.get(h.id)??null}))}))}
export async function getCitizenActivity(userId:string,id:string){const item=(await listCitizenActivities(userId)).find(x=>x.id===id);if(!item)throw new CatalogNotFoundError("Actividad no disponible.");const full=await prisma.actividad.findUnique({where:{id},select:{descripcion:true}});return{...item,...full}}
export const createCitizenEnrollment=(userId:string,activityScheduleId:string,nivelConsentido:boolean)=>createEnrollment({usuarioId:userId,horarioActividadId:activityScheduleId,nivelConsentido});
export async function listCitizenEnrollments(userId:string){const rows=await prisma.inscripcion.findMany({where:{usuarioId:userId},include:{horarioActividad:{include:{actividad:{select:{id:true,nombre:true}},establecimiento:{select:{id:true,nombre:true}},clases:{where:{fecha:{gte:new Date()}},orderBy:{fecha:"asc"},take:1}}}},orderBy:{fechaInscripcion:"desc"}});return Promise.all(rows.map(async x=>({id:x.id,status:x.estado,enrollmentDate:x.fechaInscripcion,waitlistPosition:x.estado==="LISTA_ESPERA"?await prisma.inscripcion.count({where:{horarioActividadId:x.horarioActividadId,estado:"LISTA_ESPERA",fechaListaEspera:{lte:x.fechaListaEspera??x.createdAt}}}):null,schedule:{id:x.horarioActividad.id,day:x.horarioActividad.diaSemana,startTime:x.horarioActividad.horaInicio,endTime:x.horarioActividad.horaFin,activity:x.horarioActividad.actividad,establishment:x.horarioActividad.establecimiento},nextSession:x.horarioActividad.clases[0]?{id:x.horarioActividad.clases[0].id,date:dateText(x.horarioActividad.clases[0].fecha)}:null})))}
export async function cancelCitizenEnrollment(userId:string,id:string,reason?:string){const own=await prisma.inscripcion.findFirst({where:{id,usuarioId:userId},select:{id:true,estado:true}});if(!own)throw new CatalogNotFoundError("Inscripción no encontrada.");if(!["CONFIRMADA","LISTA_ESPERA","PENDIENTE"].includes(own.estado))throw new CatalogValidationError("La inscripción no puede cancelarse.");return cancelEnrollment(id,reason)}
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
      estado:{in:["CONFIRMADA","PENDIENTE","LISTA_ESPERA","CANCELADA"]},
      horarioActividad:{estado:{notIn:["CANCELADO","FINALIZADO"]}},
    },
    select:{horarioActividadId:true,horarios:{select:{horarioActividadId:true}}},
  });
  const scheduleIds=[...new Set(schedules.flatMap(item=>item.horarios.length?item.horarios.map(scope=>scope.horarioActividadId):[item.horarioActividadId]))];
  let createdCount=0;
  for(const horarioActividadId of scheduleIds){
    try{
      const result=await generateActivitySessions({activityScheduleId:horarioActividadId,dateFrom,dateTo,excludedDates:[]});
      createdCount+=result.createdDates.length;
    }catch(error){
      if(!(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"))throw error;
    }
  }
  return{scheduleCount:scheduleIds.length,createdCount};
}

export async function listCitizenSchedule(userId:string,options:CitizenScheduleOptions={}){
  const enrollmentStatuses=options.enrollmentStatuses??["CONFIRMADA","PENDIENTE","LISTA_ESPERA","CANCELADA"];
  const dateFilter=options.dateFrom&&options.dateTo
    ? {gte:options.dateFrom,lte:options.dateTo}
    : options.upcomingOnly?{gte:new Date()}:undefined;
  const where={
    ...(dateFilter?{fecha:dateFilter}:{}),
    horarioActividad:{inscripciones:{some:{usuarioId:userId,estado:{in:enrollmentStatuses}}}},
  };
  const rows=await prisma.claseActividad.findMany({
    where,
    select:{
      id:true,fecha:true,horaInicio:true,horaFin:true,estado:true,espacio:true,cupoMaximo:true,asistenciaCerradaAt:true,
      horarioActividad:{select:{
        cupoMaximo:true,
        actividad:{select:{id:true,nombre:true,modalidadInscripcion:true,horasCancelacionJustificada:true}},
        inscripciones:{where:{usuarioId:userId,estado:{in:enrollmentStatuses}},select:{id:true,estado:true,fechaCancelacion:true},take:1},
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
  const visibleRows=rows.filter(x=>{
    const enrollment=x.horarioActividad.inscripciones[0]!;
    return enrollment.estado!=="CANCELADA"||isCanceledCitizenSessionVisible(dateText(x.fecha),x.horaInicio,enrollment.fechaCancelacion);
  });
  const total=options.limit?await prisma.claseActividad.count({where}):visibleRows.length;
  return{total,items:visibleRows.map(x=>{
    const enrollment=x.horarioActividad.inscripciones[0]!;
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
      activity:{id:x.horarioActividad.actividad.id,name:x.horarioActividad.actividad.nombre,enrollmentMode:x.horarioActividad.actividad.modalidadInscripcion,cancellationNoticeHours:x.horarioActividad.actividad.horasCancelacionJustificada},
      establishment:{id:x.establecimiento.id,name:x.establecimiento.nombre},
      primaryProfessor:professor?[professor.nombre,professor.apellido].filter(Boolean).join(" ")||null:null,
      reservation:x.reservas[0]?{id:x.reservas[0].id,status:x.reservas[0].estado,justified:x.reservas[0].cancelacionJustificada,reason:x.reservas[0].motivoCancelacion,offerExpiresAt:x.reservas[0].ofertaVenceAt}:null,
      capacity:x.cupoMaximo??x.horarioActividad.cupoMaximo,
      reservedCount:x._count.reservas,
    };
  })};
}
export async function listCitizenAttendance(userId:string){const rows=await prisma.asistencia.findMany({where:{inscripcion:{usuarioId:userId}},include:{claseActividad:{include:{horarioActividad:{include:{actividad:{select:{id:true,nombre:true}}}},establecimiento:{select:{id:true,nombre:true}}}}},orderBy:{claseActividad:{fecha:"desc"}}});return rows.map(x=>({id:x.id,status:x.estado,justificationReason:x.motivoJustificacion,date:dateText(x.claseActividad.fecha),startTime:x.claseActividad.horaInicio,endTime:x.claseActividad.horaFin,activity:x.claseActividad.horarioActividad.actividad,establishment:x.claseActividad.establecimiento}))}
const citizenProfileSelect={id:true,userId:true,nombre:true,apellido:true,documento:true,email:true,celular:true,domicilio:true,domicilioPlaceId:true,domicilioLat:true,domicilioLng:true,fechaNacimiento:true,avatarUrl:true,fotoPerfilUrl:true,contactoEmergenciaNombre:true,contactoEmergenciaTelefono:true,coberturaMedicaId:true,numeroAfiliado:true,updatedAt:true,coberturaMedica:{select:{id:true,nombre:true,tipo:true}}} satisfies Prisma.UsuarioSelect;
export async function getCitizenProfile(userId:string){const user=await prisma.usuario.findFirst({where:{id:userId,deletedAt:null},select:citizenProfileSelect});if(!user)throw new CatalogNotFoundError("Usuario no encontrado.");return user}
export async function updateCitizenProfile(userId:string,input:{firstName:string;lastName:string;phone:string;address:string;addressPlaceId?:string|null;addressLat?:number|null;addressLng?:number|null;profilePhotoUrl?:string|null;birthDate:string;emergencyContactName:string;emergencyContactPhone:string;medicalCoverageId?:string|null;affiliateNumber?:string}){return prisma.$transaction(async tx=>{const updated=await tx.usuario.update({where:{id:userId},data:{nombre:input.firstName.trim(),apellido:input.lastName.trim(),celular:input.phone.trim(),domicilio:input.address.trim(),domicilioPlaceId:input.addressPlaceId??null,domicilioLat:input.addressLat??null,domicilioLng:input.addressLng??null,contactoEmergenciaNombre:input.emergencyContactName.trim(),contactoEmergenciaTelefono:input.emergencyContactPhone.trim(),coberturaMedicaId:input.medicalCoverageId??null,numeroAfiliado:input.affiliateNumber?.trim()||null,...(input.profilePhotoUrl!==undefined?{fotoPerfilUrl:input.profilePhotoUrl}:{}),fechaNacimiento:new Date(`${input.birthDate}T00:00:00.000Z`)},select:citizenProfileSelect});const fullName=[updated.nombre,updated.apellido].filter(Boolean).join(" ")||updated.userId;await notifyAdministrators({senderId:userId,type:"GENERAL",title:"Datos de perfil actualizados",message:`${fullName} modificó información de su perfil.`,priority:"NORMAL",actionUrl:`/users/${updated.id}`,actionLabel:"Ver usuario",entityType:"user_profile",entityId:updated.id,deduplicationKey:`profile-updated:${updated.id}:${updated.updatedAt.getTime()}`},tx);return updated})}
export const getCitizenQr=(userId:string)=>getDigitalAccessQrStatus(userId);export const issueCitizenQr=(userId:string)=>issueDigitalAccessQr(userId);export const revokeCitizenQr=(userId:string)=>revokeDigitalAccessQr(userId);
