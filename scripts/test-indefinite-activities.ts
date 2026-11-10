/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated adapter for actual server modules; no database connection. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { actividadSchema, updateActividadSchema } from "../src/features/actividades/schemas/actividad.schema";
import { generateActivitySessionsSchema } from "../src/features/activity-sessions/schemas/activity-session.schema";
import { activityDraftPayloadSchema } from "../src/features/activity-workflow/schemas/activity-draft.schema";

const date=(text:string)=>new Date(`${text}T00:00:00Z`);
const teacherId="11111111-1111-4111-8111-111111111111";
const otherTeacherId="22222222-2222-4222-8222-222222222222";
const activity:any={id:"a",nombre:"Yoga",estado:"ACTIVA",fechaInicio:date("2026-01-01"),fechaFin:null,fechasExcluidas:[],modalidadOperacion:"HORARIO_FIJO",duracionTurnoMinutos:null};
const schedule:any={id:"s",actividadId:"a",estado:"ACTIVO",diaSemana:"LUNES",horaInicio:"09:00",horaFin:"10:00",establecimientoId:"e",espacio:null,cupoMaximo:12,intervaloTurnoMinutos:0,profesores:[{profesorId:teacherId,esPrincipal:true}],recursos:[],actividad:activity,teacherAssignments:null};
const sessions:any[]=[];
const reservations:any[]=[];
const resourceReservations:any[]=[];
const blocks:any[]=[];
let conflict=false;
let transactionTail=Promise.resolve();
function inDates(row:any,where:any):boolean {
  if(where.id?.in&&!where.id.in.includes(row.id))return false;
  if(where.estado?.notIn?.includes(row.estado))return false;
  if(where.fecha?.in&&!where.fecha.in.some((item:Date)=>item.getTime()===row.fecha.getTime()))return false;
  if(where.fecha?.gt&&!(row.fecha>where.fecha.gt))return false;
  if(where.fecha?.gte&&!(row.fecha>=where.fecha.gte))return false;
  if(where.fecha?.lt&&!(row.fecha<where.fecha.lt))return false;
  if(where.fecha?.lte&&!(row.fecha<=where.fecha.lte))return false;
  if(where.fecha instanceof Date&&where.fecha.getTime()!==row.fecha.getTime())return false;
  if(where.horaInicio?.gte&&row.horaInicio<where.horaInicio.gte)return false;
  if(where.OR&&!where.OR.some((item:any)=>inDates(row,item)))return false;
  return true;
}
const configurationRow=()=>({id:"configuration",actividadId:activity.id,creadoPorId:teacherId,publicadoAt:new Date(),payload:{__activity:{version:1,startDate:activity.fechaInicio.toISOString().slice(0,10),endDate:activity.fechaFin?.toISOString().slice(0,10)??null,excludedDates:activity.fechasExcluidas,schedules:[{id:schedule.id,establecimientoId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,teacherAssignments:schedule.teacherAssignments??[]}]}}});
const tx:any={
  actividadBorrador:{findUnique:async()=>configurationRow(),findMany:async()=>[configurationRow()]},
  $queryRaw:async()=>[],
  horarioActividad:{findUnique:async()=>schedule,findMany:async({where}:any)=>schedule.estado==="ACTIVO"&&["ACTIVA","SIN_CUPO","COMPLETA"].includes(activity.estado)?[schedule]:[],updateMany:async({data}:any)=>Object.assign(schedule,data)},
  profesor:{findMany:async({where}:any)=>where.id.in.map((id:string)=>({id,estado:"ACTIVO"}))},
  claseActividad:{
    findMany:async({where,include}:any)=>include?(conflict?[{profesores:[{profesorId:teacherId,profesor:{usuario:{nombre:"Docente",apellido:"Ocupado"}}}],horarioActividad:{actividad:{nombre:"Otra actividad"}}}]:[]):sessions.filter(row=>inDates(row,where)),
    create:async({data}:any)=>{const row={id:`c${sessions.length}`,asistenciaCerradaAt:null,...data};sessions.push(row);return row;},
    updateMany:async({where,data}:any)=>{sessions.filter(row=>inDates(row,where)).forEach(row=>Object.assign(row,data));},
  },
  bloqueoRecurso:{createMany:async({data}:any)=>blocks.push(...data),deleteMany:async({where}:any)=>{for(let i=blocks.length-1;i>=0;i--)if(where.claseActividadId.in.includes(blocks[i].claseActividadId))blocks.splice(i,1);}},
  reservaClase:{updateMany:async({where,data}:any)=>{reservations.filter(row=>where.claseActividadId.in.includes(row.claseActividadId)).forEach(row=>Object.assign(row,data));}},
  reservaRecurso:{updateMany:async({data}:any)=>resourceReservations.forEach(row=>Object.assign(row,data))},
  $transaction:async(callback:any)=>{const previous=transactionTail;let release!:()=>void;transactionTail=new Promise<void>(resolve=>{release=resolve;});await previous;try{return await callback(tx);}finally{release();}},
};
function loadServer(file:string,extra="",overrides:Record<string,unknown>={}){
  const filePath=resolve(file),localRequire=createRequire(filePath);
  const compiled=ts.transpileModule(readFileSync(filePath,"utf8")+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports:any={};
  runInThisContext(`(function(exports,require){${compiled}\n})`,{filename:filePath})(exports,(name:string)=>name in overrides?overrides[name]:name==="@/lib/db"?{prisma:tx}:name.includes("notifications.server")?{createNotifications:async()=>{}}:localRequire(name));
  return exports;
}
const server=loadServer("src/features/activity-sessions/services/activity-sessions.server.ts");
const lifecycle=loadServer("src/features/actividades/services/actividades.server.ts","\nexport { propagateActivityState, cancelSessionsOutsideValidity };\n");
async function main(){
  const base={nombre:"Yoga",fechaInicio:"2026-01-01",publicosObjetivoIds:[]};
  assert.ok(actividadSchema.safeParse({...base,fechaFin:"2027-01-01"}).success);
  assert.ok(actividadSchema.safeParse({...base,fechaFin:null}).success);
  assert.equal(actividadSchema.safeParse({...base,fechaInicio:undefined}).success,false);
  assert.equal(actividadSchema.safeParse({...base,fechaFin:"2025-01-01"}).success,false);
  assert.equal(activityDraftPayloadSchema.parse({vigenciaReserva:"MENSUAL",generacionClasesDesde:"2026-01-01",generacionClasesHasta:null}).generacionClasesHasta,null,"Monthly enrollment must not end the activity");
  // Validate creation/edit contracts and actual progressive generation for every duration.
  const ends=["2026-12-01","2027-05-01","2027-11-01","2028-11-01","2031-11-01",null];
  for(const end of ends){
    const validity={fechaInicio:"2026-11-01",fechaFin:end};
    assert.ok(actividadSchema.safeParse({...base,...validity}).success);
    assert.ok(updateActividadSchema.safeParse(validity).success);
    activity.fechaInicio=date(validity.fechaInicio);activity.fechaFin=end?date(end):null;
    schedule.profesores=[];
    const queryEnd=end??"2031-11-01";
    const queryStart=new Date(date(queryEnd));queryStart.setUTCDate(queryStart.getUTCDate()-28);
    const query={dateFrom:queryStart.toISOString().slice(0,10),dateTo:queryEnd};
    const before=sessions.length;
    await server.ensureActivitySessions(query);
    const matching=sessions.filter(row=>row.fecha>=queryStart&&row.fecha<=date(queryEnd));
    assert.ok(matching.length>0,`Future month for ${end??"indefinite"}`);
    assert.ok(matching.every(row=>row.profesores.create.length===0));
    assert.ok(sessions.length-before<=5,"Only the requested month is materialized");
    const count=sessions.length;
    await server.ensureActivitySessions(query);
    assert.equal(sessions.length,count,"Repeated future query is idempotent");
    if(end){
      const after=new Date(date(end));after.setUTCDate(after.getUTCDate()+1);
      await server.ensureActivitySessions({dateFrom:after.toISOString().slice(0,10),dateTo:`${Number(end.slice(0,4))+1}-12-31`});
      assert.equal(sessions.length,count,"No generation beyond finite end");
    }
    sessions.length=0;blocks.length=0;
  }
  assert.equal(generateActivitySessionsSchema.safeParse({activityScheduleId:"s",dateFrom:"2026-11-01",dateTo:"2028-11-01"}).success,false,"Bulk materialization remains bounded independently from validity");
  activity.fechaInicio=date("2026-01-01");activity.fechaFin=null;
  schedule.profesores=[{profesorId:teacherId,esPrincipal:true}];
  const range={dateFrom:"2031-06-01",dateTo:"2031-06-30",activityId:"a"};
  assert.ok((await server.ensureActivitySessions(range)).createdCount>0,"Availability five years after start");
  const originalCount=sessions.length;
  const result=await server.ensureActivitySessions(range);
  assert.equal(result.createdCount,0);
  assert.equal(sessions.length,originalCount);
  await Promise.all([server.ensureActivitySessions(range),server.ensureActivitySessions(range)]);
  assert.equal(sessions.length,originalCount,"Repeated concurrent requests preserve identity");
  activity.fechaFin=date("2031-06-10");
  await server.ensureActivitySessions({dateFrom:"2032-01-01",dateTo:"2032-01-31"});
  assert.equal(sessions.length,originalCount,"Finite validity stops future generation");
  activity.fechaFin=null;
  await server.ensureActivitySessions({dateFrom:"2032-01-01",dateTo:"2032-01-31"});
  assert.ok(sessions.length>originalCount,"Finite to indefinite resumes generation");
  const january=sessions.filter(item=>item.fecha>=date("2032-01-01"));
  const originalId=january[0].id;
  reservations.push({claseActividadId:originalId,estado:"RESERVADA"});
  await lifecycle.cancelSessionsOutsideValidity(tx,"a",activity.fechaInicio,date("2031-12-31"),[]);
  assert.equal(sessions.find(item=>item.id===originalId)?.estado,"CANCELADA");
  assert.equal(reservations[0].estado,"CANCELADA");
  assert.equal(sessions.length,originalCount+january.length,"Shortening preserves history and IDs");
  const beforeLongRange=sessions.length;
  await server.ensureActivitySessions({dateFrom:"2033-01-01",dateTo:"2033-12-31"});
  assert.equal(sessions.length-beforeLongRange,52,"A year is batched, never truncated to a fixed validity window");
  activity.fechasExcluidas=["2034-01-02"];
  await server.ensureActivitySessions({dateFrom:"2034-01-01",dateTo:"2034-01-07"});
  assert.equal(sessions.some(row=>row.fecha.getTime()===date("2034-01-02").getTime()),false);
  activity.fechasExcluidas=[];
  activity.modalidadOperacion="TURNO_RECURRENTE";schedule.duracionTurnoMinutos=30;
  schedule.teacherAssignments=[{startTime:"09:00",endTime:"09:30",professorIds:[teacherId]},{startTime:"09:30",endTime:"10:00",professorIds:[otherTeacherId]}];
  await server.ensureActivitySessions({dateFrom:"2035-01-01",dateTo:"2035-01-01"});
  const turns=sessions.filter(row=>row.fecha.getTime()===date("2035-01-01").getTime());
  assert.equal(turns.length,2);
  assert.equal(turns[1].profesores.create[0].profesorId,otherTeacherId,"Future turns keep their own teacher assignments");
  conflict=true;
  await assert.rejects(server.generateActivitySessions({activityScheduleId:"s",dateFrom:"2035-01-08",dateTo:"2035-01-08",excludedDates:[]}),/ya tiene/);
  conflict=false;
  const citizenDb:any={...tx,
    inscripcion:{findMany:async()=>[{id:"enrollment",estado:"CONFIRMADA",fechaCancelacion:null,horarioActividadId:"s",horarios:[]}]},
    claseActividad:{findMany:async({where}:any)=>sessions.filter(row=>inDates(row,where)).map(row=>({...row,horarioActividad:{cupoMaximo:12,actividad:{...activity,modalidadInscripcion:"PERMANENTE"},profesores:[{profesor:{usuario:{nombre:"Otro turno",apellido:"Docente"}}}]},establecimiento:{id:"e",nombre:"Sede"},profesores:[],asistencias:[],reservas:[],_count:{reservas:0}}))},
  };
  const citizen=loadServer("src/features/citizen/services/citizen.server.ts","",{
    "@/lib/db":{prisma:citizenDb},
    "@/features/activity-sessions/services/activity-sessions.server":server,
    "@/features/enrollments/services/enrollments.server":{},
    "@/features/attendance-qr/services/qr-credentials.server":{},
    "@/features/access/services/digital-access-qr.server":{},
  });
  const calendar=await citizen.listCitizenSchedule("user",{dateFrom:date("2036-01-01"),dateTo:date("2036-01-31")});
  assert.ok(calendar.items.length>0,"Citizen calendar materializes the requested future month");
  assert.ok(calendar.items.every((item:any)=>item.date.startsWith("2036-01")&&item.activity.name==="Yoga"));
  await Promise.all([server.ensureActivitySessions({dateFrom:"2037-01-01",dateTo:"2037-01-31"}),server.ensureActivitySessions({dateFrom:"2037-01-01",dateTo:"2037-01-31"})]);
  assert.equal(new Set(sessions.map(item=>`${item.horarioActividadId}:${item.fecha.toISOString()}:${item.horaInicio}`)).size,sessions.length,"Concurrent first materialization must not duplicate classes");
  assert.ok(calendar.items.every((item:any)=>item.primaryProfessor===null),"Unassigned classes must not display another slot's schedule teacher");
  const calendarIds=calendar.items.map((item:any)=>item.id);
  assert.deepEqual((await citizen.listCitizenSchedule("user",{dateFrom:date("2036-01-01"),dateTo:date("2036-01-31")})).items.map((item:any)=>item.id),calendarIds);
  activity.estado="SUSPENDIDA";
  assert.equal((await server.ensureActivitySessions(range)).scheduleCount,0);
  await assert.rejects(server.generateActivitySessions({activityScheduleId:"s",dateFrom:"2035-01-08",dateTo:"2035-01-08",excludedDates:[]}),/nuevas clases/);
  activity.estado="ACTIVA";
  sessions.push({id:"history",fecha:date("2020-01-01"),horaInicio:"09:00",horaFin:"10:00",estado:"FINALIZADA",asistenciaCerradaAt:date("2020-01-02")});
  await lifecycle.propagateActivityState(tx,"a","ACTIVA","FINALIZADA");
  activity.estado="FINALIZADA";
  assert.equal(schedule.estado,"FINALIZADO");
  assert.ok(sessions.filter(item=>item.id!=="history").every(item=>item.estado==="CANCELADA"),"Finalization cancels pending future classes");
  assert.equal((await server.ensureActivitySessions({dateFrom:"2040-01-01",dateTo:"2040-12-31"})).createdCount,0);
  assert.equal(sessions.find(item=>item.id==="history")?.estado,"FINALIZADA");
  assert.ok(sessions.some(item=>item.id===originalId),"Historical relationships remain intact");
  console.log("OK: validity schemas, year-range materialization, idempotency, finite/indefinite conversion, exclusions, slot teachers, conflicts, citizen calendar, suspension, finalization and history.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
