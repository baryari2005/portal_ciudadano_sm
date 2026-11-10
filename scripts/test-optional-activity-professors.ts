/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated Prisma adapter exercises real schedule/session services without a database. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { effectiveTeacherAssignments } from "../src/features/activity-workflow/helpers/teacher-slot-assignments";
import { activityDraftPayloadSchema } from "../src/features/activity-workflow/schemas/activity-draft.schema";
import { createActivityScheduleSchema } from "../src/features/activity-schedules/schemas/activity-schedule.schema";

const ids=["11111111-1111-4111-8111-111111111111","22222222-2222-4222-8222-222222222222"];
const teachers=new Map(ids.map((id,index)=>[id,{id,estado:"ACTIVO",usuario:{nombre:`Profesor ${index}`,apellido:"Prueba"}}]));
const activity={id:"activity",nombre:"Gimnasio libre",estado:"ACTIVA",fechaInicio:new Date("2026-01-01T00:00:00Z"),fechaFin:null as Date|null,fechasExcluidas:[],modalidadOperacion:"HORARIO_FIJO"};
const establishment={id:"establishment",nombre:"Sede",direccion:"Calle 1",activo:true};
let current:any=null;
let sessionSequence=0;
let conflictingRows:any[]=[];
const classes:any[]=[];
const links=(entries:any[])=>entries.map(item=>({...item,profesor:teachers.get(item.profesorId)}));
let storedTemplates:any[]=[];
let configurationUpdatedAt=new Date("2026-01-01T00:00:00Z");
const configurationRow=()=>({id:"configuration",actividadId:activity.id,creadoPorId:ids[0],publicadoAt:new Date(),updatedAt:configurationUpdatedAt,payload:{__activity:{version:1,startDate:activity.fechaInicio.toISOString().slice(0,10),endDate:activity.fechaFin?.toISOString().slice(0,10)??null,excludedDates:activity.fechasExcluidas,schedules:storedTemplates}}});
const tx:any={
  actividadBorrador:{findUnique:async()=>configurationRow(),updateMany:async({where,data}:any)=>{if(where.updatedAt.getTime()!==configurationUpdatedAt.getTime())return{count:0};storedTemplates=data.payload.__activity.schedules;configurationUpdatedAt=data.updatedAt;return{count:1};},update:async({data}:any)=>{storedTemplates=data.payload.__activity.schedules;return configurationRow();}},
  $queryRaw:async()=>[],
  $transaction:async(callback:any)=>callback(tx),
  actividad:{findUnique:async()=>activity},
  establecimiento:{findUnique:async()=>establishment},
  profesor:{findMany:async({where}:any)=>where.id.in.map((id:string)=>teachers.get(id)).filter(Boolean)},
  horarioActividad:{
    findUnique:async()=>current?structuredClone(current):null,
    findMany:async()=>conflictingRows,
    create:async({data}:any)=>{current={id:"schedule",...data,actividad:activity,establecimiento:establishment,profesores:links(data.profesores.create),recursos:[],teacherAssignments:null};return structuredClone(current);},
    update:async({data}:any)=>{Object.assign(current,data);return structuredClone(current);},
  },
  horarioActividadProfesor:{
    deleteMany:async()=>{current.profesores=[];},
    createMany:async({data}:any)=>{current.profesores=links(data);},
  },
  claseActividad:{
    findMany:async({where,include}:any)=>{
      if(include)return [];
      return classes.filter(row=>{
        if(where.fecha?.in&&!where.fecha.in.some((date:Date)=>date.getTime()===row.fecha.getTime()))return false;
        if(where.estado?.in&&!where.estado.in.includes(row.estado))return false;
        if(where.asistenciaCerradaAt===null&&row.asistenciaCerradaAt!==null)return false;
        if(where.OR&&!where.OR.some((part:any)=>part.fecha?.gt?row.fecha>part.fecha.gt:row.fecha.getTime()===part.fecha.getTime()&&row.horaInicio>=part.horaInicio.gte))return false;
        return true;
      });
    },
    create:async({data}:any)=>{const row={id:`class-${++sessionSequence}`,...data,asistenciaCerradaAt:null,profesores:links(data.profesores.create)};classes.push(row);return row;},
  },
  claseActividadProfesor:{
    deleteMany:async({where}:any)=>{classes.find(row=>row.id===where.claseActividadId).profesores=[];},
    createMany:async({data}:any)=>{for(const item of data)classes.find(row=>row.id===item.claseActividadId).profesores.push(...links([item]));},
  },
};
function load(file:string,overrides:Record<string,unknown>={}){
  const path=resolve(file),localRequire=createRequire(path),exports:any={};
  const compiled=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInThisContext(`(function(exports,require){${compiled}\n})`,{filename:path})(exports,(name:string)=>name in overrides?overrides[name]:name==="@/lib/db"?{prisma:tx}:name.includes("notifications.server")?{createNotifications:async()=>{}}:name.includes("audit-log.server")?{createAuditLogTx:async()=>{}}:localRequire(name));
  return exports;
}
const sessions=load("src/features/activity-sessions/services/activity-sessions.server.ts");
const schedules=load("src/features/activity-schedules/services/activity-schedules.server.ts",{"@/features/activity-sessions/services/activity-sessions.server":sessions});
const base=createActivityScheduleSchema.parse({actividadId:activity.id,establecimientoId:establishment.id,diaSemana:"LUNES",horaInicio:"09:00",horaFin:"10:00",cupoMaximo:20});
async function main(){
  const draftSchedule=activityDraftPayloadSchema.parse({schedules:[{establecimientoId:establishment.id,diaSemana:"LUNES",horaInicio:"09:00",horaFin:"10:00",cupoMaximo:20,profesorIds:[ids[1]],teacherAssignments:[{startTime:"09:00",endTime:"10:00",professorIds:[ids[0]]}]}]}).schedules[0];
  assert.deepEqual(effectiveTeacherAssignments(draftSchedule,null,0,false)[0].professorIds,[ids[1]],"Fixed schedules use the current roster when replacing teachers");
  assert.deepEqual(effectiveTeacherAssignments({...draftSchedule,profesorIds:[]},null,0,false)[0].professorIds,[]);
  assert.deepEqual(effectiveTeacherAssignments({...draftSchedule,profesorIds:[]},60,0,true)[0].professorIds,[],"Removed teachers must not survive in saved slot assignments");
  assert.equal(createActivityScheduleSchema.safeParse({...base,profesoresIds:[],profesorPrincipalId:ids[0]}).success,false,"An explicit principal must belong to the selected teachers");
  assert.equal((await schedules.createActivitySchedule(base)).professors.length,0);
  const result=await sessions.generateActivitySessions({activityScheduleId:"schedule",dateFrom:"2040-01-02",dateTo:"2040-01-02",excludedDates:[]});
  assert.equal(result.createdDates.length,1);
  assert.equal(classes[0].profesores.length,0,"Classes can be generated with no teacher");
  const historical={id:"historical",fecha:new Date("2020-01-06T00:00:00Z"),horaInicio:"09:00",horaFin:"10:00",estado:"FINALIZADA",asistenciaCerradaAt:new Date(),profesores:links([{profesorId:ids[0],esPrincipal:true}])};
  classes.push(historical);
  const historyBefore=structuredClone(historical);
  let row=await schedules.updateActivitySchedule("schedule",{profesoresIds:[ids[0]],profesorPrincipalId:ids[0]});
  assert.equal(row.professors[0].isPrimary,true);
  assert.equal(classes[0].profesores[0].profesorId,ids[0]);
  row=await schedules.updateActivitySchedule("schedule",{profesoresIds:[ids[1]],profesorPrincipalId:ids[1]});
  assert.equal(row.professors[0].id,ids[1]);
  assert.equal(classes[0].profesores[0].profesorId,ids[1]);
  row=await schedules.updateActivitySchedule("schedule",{profesoresIds:[]});
  assert.equal(row.professors.length,0,"Removing all teachers clears an inherited principal");
  assert.equal(classes[0].profesores.length,0,"Future classes lose the assignment, not their record");
  assert.deepEqual(historical,historyBefore,"Historical teacher links remain unchanged");
  assert.equal(teachers.size,2,"Removing assignments never deletes teacher records");
  row=await schedules.updateActivitySchedule("schedule",{profesoresIds:ids,profesorPrincipalId:ids[0]});
  assert.equal(row.professors.length,2);
  assert.equal(row.professors.filter((item:any)=>item.isPrimary).length,1);
  assert.equal(classes[0].profesores.filter((item:any)=>item.esPrincipal).length,1);
  await schedules.updateActivitySchedule("schedule",{profesoresIds:[],profesorPrincipalId:null});
  await sessions.syncGeneratedSessionTeachers("schedule",[{startTime:"09:00",endTime:"10:00",professorIds:[]}]);
  assert.equal(classes[0].profesores.length,0,"Workflow teacher synchronization accepts empty assignments");
  assert.deepEqual(historical,historyBefore);
  const citizen={id:"citizen",nombre:"Ciudadano",apellido:"Prueba",documento:"123",avatarUrl:null};
  const enrollment={id:"enrollment",usuarioId:citizen.id,usuario:citizen,estado:"CONFIRMADA",modalidad:"PERMANENTE",horarioActividadId:"schedule",horarios:[],reservas:[]};
  const attendanceRows:any[]=[];
  tx.claseActividad.findUnique=async({where}:any)=>{const row=classes.find(item=>item.id===where.id);return row?{...row,horarioActividad:current,establecimiento:establishment,asistenciaCerradaPor:null}:null;};
  tx.inscripcion={findUnique:async()=>enrollment,findMany:async()=>[enrollment]};
  tx.asistencia={findMany:async()=>attendanceRows.map(item=>({...item,inscripcion:enrollment})),upsert:async({create}:any)=>{const row={id:"attendance",...create};attendanceRows.push(row);return row;}};
  tx.registroAcceso={findMany:async()=>[]};
  const attendance=load("src/features/attendance/services/attendance.server.ts",{
    "@/features/activity-sessions/services/activity-sessions.server":sessions,
    "@/features/class-reservations/services/participation-review.server":{evaluateParticipationReview:async()=>{}},
  });
  const auth=load("src/lib/server-auth.ts",{"@/lib/jwt":{},"@/features/auth/libs/access-state":{}});
  const permissions={permisos:[{modulo:"attendance",accion:"crear"}]};
  auth.requirePermission(permissions,"attendance","crear");
  assert.throws(()=>auth.requirePermission({permisos:[]},"attendance","crear"),/FORBIDDEN/);
  tx.profesor.findUnique=async()=>teachers.get(ids[0]);
  tx.claseActividad.findFirst=async({where}:any)=>classes.find(row=>row.id===where.id&&row.profesores.some((item:any)=>item.profesorId===where.profesores.some.profesorId))??null;
  const teacherAccess=load("src/features/teacher/services/teacher.server.ts",{
    "@/features/attendance/services/attendance.server":attendance,
    "@/features/activity-sessions/services/activity-sessions.server":sessions,
    "@/features/enrollment-documents/services/enrollment-documents.server":{},
  });
  await assert.rejects(teacherAccess.assertTeacherSession("teacher-user",classes[0].id),(error:any)=>error.status===403,"Unassigned teachers gain no access to attendance");
  const datePolicy=load("src/features/attendance/services/attendance-date-policy.server.ts");
  await assert.rejects(datePolicy.assertAdministratorCanTakeAttendance(classes[0].id),/clase futura/);
  classes[0].fecha=new Date("2025-01-06T00:00:00Z");
  await datePolicy.assertAdministratorCanTakeAttendance(classes[0].id);
  const roster=await attendance.markAttendance({activitySessionId:classes[0].id,enrollmentId:enrollment.id,status:"PRESENTE"},"authorized-administrator");
  assert.equal(roster.session.professors.length,0);
  assert.equal(roster.summary.presentCount,1,"Attendance service works without teachers after the existing authorization checks");
  assert.equal(attendanceRows[0].registradoPorId,"authorized-administrator");
  teachers.get(ids[1])!.estado="SUSPENDIDO";
  await assert.rejects(schedules.updateActivitySchedule("schedule",{profesoresIds:[ids[1]]}),/no est\u00e1 activo/);
  teachers.get(ids[1])!.estado="ACTIVO";
  conflictingRows=[{...current,profesores:links([{profesorId:ids[0]}])}];
  await assert.rejects(schedules.updateActivitySchedule("schedule",{profesoresIds:[ids[0]]}),/ya tiene/);
  conflictingRows=[];
  assert.equal((await schedules.createActivitySchedule({...base,profesoresIds:[ids[0]],profesorPrincipalId:ids[0]})).professors.length,1);
  const combinations=[];
  for(const [index,combination] of [{teacher:true,finite:true},{teacher:false,finite:true},{teacher:true,finite:false},{teacher:false,finite:false}].entries()){
    const first=new Date(Date.UTC(2045,index,1)),last=new Date(Date.UTC(2045,index,7));
    Object.assign(activity,{fechaFin:combination.finite?last:null});
    const input={...base,profesoresIds:combination.teacher?[ids[0]]:[],profesorPrincipalId:combination.teacher?ids[0]:null};
    const created=await schedules.createActivitySchedule(input);
    assert.equal(created.professors.length,combination.teacher?1:0);
    const range={activityScheduleId:"schedule",dateFrom:first.toISOString().slice(0,10),dateTo:last.toISOString().slice(0,10),excludedDates:[]};
    const initial=await sessions.generateActivitySessions(range);
    assert.equal(initial.createdDates.length,1);
    const generated=classes[classes.length-1];
    assert.equal(generated.profesores.length,combination.teacher?1:0);
    assert.equal((await sessions.generateActivitySessions(range)).createdDates.length,0);
    await schedules.updateActivitySchedule("schedule",{observaciones:"Edicion informativa"});
    assert.equal(classes[classes.length-1].id,generated.id,"Informational changes preserve class identity");
    const future=await sessions.generateActivitySessions({...range,dateFrom:`2050-${String(index+1).padStart(2,"0")}-01`,dateTo:`2050-${String(index+1).padStart(2,"0")}-07`});
    assert.equal(future.createdDates.length,combination.finite?0:1);
    combinations.push({teacher:combination.teacher,finite:combination.finite,status:"VERIFIED_WITH_ISOLATED_ADAPTER"});
  }
  console.log(JSON.stringify({combinations}));
  console.log("OK: schedules with/without teachers; add, replace, remove, multiple teachers, principal integrity, class generation/synchronization, inactive teachers, conflicts, attendance without teachers, existing authorization/date policies and historical preservation.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
