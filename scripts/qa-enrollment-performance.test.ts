import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { realQaClient, assertLocalQaUrl } from "./qa-real-client.mjs";

async function main(){
  const connection=assertLocalQaUrl(/^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env","utf8"))![1]).toString();
  Object.assign(process.env,{DATABASE_URL:connection,DIRECT_URL:connection,NEXT_PUBLIC_SUPABASE_URL:"http://127.0.0.1:1",NEXT_PUBLIC_SUPABASE_ANON_KEY:"qa-disabled",SUPABASE_SERVICE_ROLE_KEY:"qa-disabled"});
  // The existing HTTP helper returns heterogeneous endpoint DTOs.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q=await realQaClient() as unknown as {db:PrismaClient;users:Record<string,{id:string}>;call:(route:string,options?:{role?:string;method?:string;body?:unknown;status?:number|number[]})=>Promise<any>;authenticate:(role:string,userId:string,password:string)=>Promise<unknown>;calls:{method:string;route:string;status:number}[]}; // All four HTTP identities must match the local database.
  const db=new PrismaClient({datasourceUrl:connection,log:[{emit:"event",level:"query"}]});
  (globalThis as typeof globalThis & {prisma:unknown}).prisma=db;
  let trace:string[]=[]; db.$on("query",e=>trace.push(e.query));
  const output="audit-evidence/enrollment-performance",results:{id:string;status:string;detail:unknown}[]=[];
  const fixture=JSON.parse(fs.readFileSync(".tmp/qa-postgres/performance-after.private.json","utf8"));
  const catalog=JSON.parse(fs.readFileSync(`${output}/integration.json`,"utf8"));
  const marker=`QA_TEST_PERF_REG_${Date.now()}`,password=randomBytes(24).toString("base64url");
  fs.writeFileSync(`.tmp/qa-postgres/${marker}.private.json`,JSON.stringify({password}));
  const citizenRole=await db.rol.findUniqueOrThrow({where:{codigo:"citizen"}});
  const service=await import("../src/features/citizen/services/citizen.server");
  const sessions=await import("../src/features/activity-sessions/services/activity-sessions.server");
  const actors:{id:string;role:string}[]=[];
  async function actor(){
    const role=`perf${actors.length}`,userId=`${marker}_${actors.length}`;
    const user=await q.call("/api/users",{method:"POST",status:201,body:{userId,email:`${userId.toLowerCase()}@example.invalid`,password,rolId:citizenRole.id,nombre:"QA_TEST",apellido:role,fechaNacimiento:"1990-01-01"}});
    await q.authenticate(role,userId,password); const a={id:user.id,role};actors.push(a);return a;
  }
  async function test(id:string,work:()=>Promise<unknown>){if(process.env.QA_PERF_TEST_IDS&&!new RegExp(process.env.QA_PERF_TEST_IDS).test(id))return;try{results.push({id,status:"PASS",detail:await work()});}catch(e){results.push({id,status:"FAIL",detail:e instanceof Error?e.message:String(e)});}fs.writeFileSync(`${output}/${process.env.QA_PERF_REPORT??"performance-regression"}.json`,JSON.stringify({marker,realPostgreSQL:true,apiInterception:false,results,actors,calls:q.calls},null,2));console.log(`${id}: ${results.at(-1)!.status}`);}
  try{
    await test("RECURRING-DETAIL-CONFIRMATION-READONLY",async()=>{
      const user=q.users.citizen;
      const before=await db.claseActividad.count({where:{horarioActividad:{actividadId:fixture.activityId}}});
      trace=[];const first=await service.getCitizenActivity(user.id,fixture.activityId),second=await service.getCitizenActivity(user.id,fixture.activityId);
      const queries=trace.slice();assert.equal(first.id,second.id);
      assert.ok(!queries.some(sql=>/^(BEGIN|INSERT|UPDATE|DELETE)|FOR UPDATE/.test(sql)));
      assert.equal(await db.claseActividad.count({where:{horarioActividad:{actividadId:fixture.activityId}}}),before);
      return {queries:queries.length,transactions:0,generatedClasses:0};
    });
    for(const variant of catalog.fixtures.filter((f:{label:string})=>/^(finite|indefinite)-(no-prof|prof)$/.test(f.label))){
      await test(`REAL-ENROLL-${variant.label}`,async()=>{
        const a=await actor();
        const detail=(await q.call(`/api/citizen/activities/${variant.id}`,{role:a.role})).data;
        assert.equal(detail.schedules[0].professors.length,variant.hasProfessor?1:0);
        const schedule=detail.schedules[0];
        const enrolled=(await q.call("/api/citizen/enrollments",{role:a.role,method:"POST",status:201,body:{activityId:variant.id,selectedSlots:[{activityScheduleId:schedule.id,startTime:schedule.startTime,endTime:schedule.endTime}],nivelConsentido:true}})).data;
        assert.equal(enrolled.status,"CONFIRMADA");
        const stored=await db.inscripcion.findUniqueOrThrow({where:{id:enrolled.id}});assert.equal(stored.usuarioId,a.id);
        const future=variant.end?"2030-11-01":"2045-11-01",to=variant.end?"2030-11-28":"2045-11-28";
        // The one-year finite variant ends before 2030; it must not generate beyond its validity.
        const calendar=await sessions.ensureActivitySessions({activityId:variant.id,dateFrom:future,dateTo:to});
        if(variant.end&&variant.end<future)assert.equal(calendar.createdCount,0);
        else assert.ok((await q.call(`/api/activity-sessions?activityId=${variant.id}&dateFrom=${future}&dateTo=${to}&pageSize=100`)).data.length>0);
        return {enrollmentId:enrolled.id,activityId:variant.id,end:variant.end,future};
      });
    }
    await test("MATERIALIZED-WINDOW-NO-TRANSACTIONS-NO-DUPLICATES",async()=>{
      const range={activityId:fixture.activityId,dateFrom:"2046-02-01",dateTo:"2046-02-28"};
      const first=await sessions.ensureActivitySessions(range);assert.ok(first.createdCount<=25);
      trace=[];const second=await sessions.ensureActivitySessions(range);const queries=trace.slice();
      assert.equal(second.createdCount,0);assert.ok(!queries.some(sql=>/^(BEGIN|INSERT|UPDATE|DELETE)|FOR UPDATE/.test(sql)));
      const rows=await db.claseActividad.findMany({where:{horarioActividad:{actividadId:fixture.activityId},fecha:{gte:new Date(range.dateFrom),lte:new Date(range.dateTo)}}});
      assert.equal(new Set(rows.map(c=>`${c.horarioActividadId}:${c.fecha.toISOString()}:${c.horaInicio}`)).size,rows.length);
      return {generated:first.createdCount,repeatQueries:queries.length,repeatTransactions:0};
    });
    await test("CONCURRENT-MULTI-SCHEDULE-DUPLICATE",async()=>{
      const a=await actor(),detail=(await q.call(`/api/citizen/activities/${fixture.activityId}`,{role:a.role})).data;
      const body={activityId:fixture.activityId,selectedSlots:detail.schedules.map((s:{id:string;startTime:string;endTime:string})=>({activityScheduleId:s.id,startTime:s.startTime,endTime:s.endTime})),nivelConsentido:true};
      const offset=q.calls.length;
      await Promise.all([1,2].map(()=>q.call("/api/citizen/enrollments",{role:a.role,method:"POST",body,status:[201,409]})));
      const statuses=q.calls.slice(offset).filter((c:{method:string;route:string})=>c.method==="POST"&&c.route==="/api/citizen/enrollments").map((c:{status:number})=>c.status).sort();
      assert.deepEqual(statuses,[201,409]);
      const saved=await db.inscripcion.findMany({where:{usuarioId:a.id,horarioActividad:{actividadId:fixture.activityId}},include:{horarios:true}});
      assert.equal(saved.length,1);assert.equal(saved[0].horarios.length,5);
      return {statuses,enrollmentId:saved[0].id,selectedSchedules:5};
    });
    await test("MULTI-SCHEDULE-LAST-SEAT-CONCURRENT",async()=>{
      const category=await db.categoriaActividad.findFirstOrThrow(),a=await actor(),b=await actor();
      let draft=(await q.call("/api/activity-drafts",{method:"POST",body:{},status:201})).data;
      const audience=await db.publicoObjetivo.findUniqueOrThrow({where:{slug:"adultos"}});
      const payload={...draft.payload,nombre:`${marker}_batch_capacity`,modalidadOperacion:"HORARIO_FIJO",categoriaActividadId:category.id,establecimientoIds:["qa-local-establishment"],publicosObjetivoIds:[audience.id],cupo:1,generacionClasesDesde:"2026-10-01",generacionClasesHasta:null,schedules:["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES"].map(diaSemana=>({establecimientoId:"qa-local-establishment",diaSemana,horaInicio:"16:00",horaFin:"17:00",cupoMaximo:1,profesorIds:[],recursoIds:[]}))};
      draft=(await q.call(`/api/activity-drafts/${draft.id}`,{method:"PATCH",body:{expectedUpdatedAt:draft.updatedAt,payload}})).data;
      const activity=(await q.call(`/api/activity-drafts/${draft.id}/publish`,{method:"POST",status:201,body:{expectedUpdatedAt:draft.updatedAt}})).data;
      const schedules=await db.horarioActividad.findMany({where:{actividadId:activity.id}});
      for(const s of schedules)await q.call(`/api/activity-schedules/${s.id}`,{method:"PATCH",body:{permiteListaEspera:false}});
      const body={activityId:activity.id,selectedSlots:schedules.map(s=>({activityScheduleId:s.id,startTime:s.horaInicio,endTime:s.horaFin})),nivelConsentido:true},offset=q.calls.length;
      await Promise.all([a,b].map(user=>q.call("/api/citizen/enrollments",{role:user.role,method:"POST",status:[201,409],body})));
      assert.deepEqual(q.calls.slice(offset).map(c=>c.status).sort(),[201,409]);
      const saved=await db.inscripcion.findMany({where:{horarioActividad:{actividadId:activity.id}},include:{horarios:true}});
      assert.equal(saved.length,1);assert.equal(saved[0].horarios.length,5);assert.equal(saved[0].estado,"CONFIRMADA");
      return {activityId:activity.id,statuses:[201,409],confirmed:1,schedules:5};
    });
    await test("EVENT-DETAIL-IDEMPOTENT-AND-CLASS-ENROLLMENT",async()=>{
      const category=await db.categoriaActividad.findFirstOrThrow(),admin=await db.usuario.findUniqueOrThrow({where:{userId:"QA_TEST_admin"}});
      const date=new Date();date.setUTCDate(date.getUTCDate()+1);date.setUTCHours(0,0,0,0);
      const dateString=date.toISOString().slice(0,10),day=(["DOMINGO","LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO"] as const)[date.getUTCDay()];
      const activity=await db.actividad.create({data:{id:randomUUID(),nombre:`${marker}_event`,modalidadOperacion:"EVENTO_UNICO",modalidadInscripcion:"POR_CLASE",categoriaActividadId:category.id,estado:"ACTIVA"}});
      const schedule=await db.horarioActividad.create({data:{actividadId:activity.id,establecimientoId:"qa-local-establishment",diaSemana:day,horaInicio:"18:00",horaFin:"19:00",cupoMaximo:5}});
      await db.actividadBorrador.create({data:{actividadId:activity.id,creadoPorId:admin.id,nombre:activity.nombre,estado:"PUBLICADO",publicadoAt:new Date(),payload:{__activity:{version:1,startDate:dateString,endDate:dateString,excludedDates:[],schedules:[{id:schedule.id,establecimientoId:schedule.establecimientoId,diaSemana:day,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,teacherAssignments:[]}]}}}});
      const a=await actor(),first=(await q.call(`/api/citizen/activities/${activity.id}`,{role:a.role})).data;assert.equal(first.eventSessions.length,1);
      trace=[];const second=await service.getCitizenActivity(a.id,activity.id);const queries=trace.slice();
      assert.equal(second.eventSessions[0].id,first.eventSessions[0].id);assert.ok(!queries.some(sql=>/^(BEGIN|INSERT|UPDATE|DELETE)|FOR UPDATE/.test(sql)));
      const enrolled=(await q.call("/api/citizen/enrollments",{role:a.role,method:"POST",status:201,body:{activityId:activity.id,classId:first.eventSessions[0].id,nivelConsentido:true}})).data;
      assert.equal(enrolled.status,"CONFIRMADA");assert.equal(await db.reservaClase.count({where:{claseActividadId:first.eventSessions[0].id,usuarioId:a.id,estado:"RESERVADA"}}),1);
      return {activityId:activity.id,classId:first.eventSessions[0].id,repeatQueries:queries.length,repeatTransactions:0,enrollmentId:enrolled.id};
    });
    await test("CITIZEN-CALENDAR-FAR-FUTURE-REAL-ENDPOINT",async()=>{
      const a=await actor(),schedule=await db.horarioActividad.findFirstOrThrow({where:{actividadId:fixture.activityId}});
      await q.call("/api/citizen/enrollments",{role:a.role,method:"POST",status:201,body:{activityId:fixture.activityId,selectedSlots:[{activityScheduleId:schedule.id,startTime:schedule.horaInicio,endTime:schedule.horaFin}],nivelConsentido:true}});
      const route="/api/citizen/schedule?dateFrom=2047-06-01&dateTo=2047-06-28";
      const first=(await q.call(route,{role:a.role})).data,second=(await q.call(route,{role:a.role})).data;
      assert.ok(first.items.length>0);assert.deepEqual(first.items.map((s:{id:string})=>s.id),second.items.map((s:{id:string})=>s.id));
      return {classes:first.items.length,period:"2047-06",identicalIds:true};
    });
    await test("SLOT-TEACHERS-WITHOUT-MATERIALIZATION",async()=>{
      const category=await db.categoriaActividad.findFirstOrThrow(),admin=await db.usuario.findUniqueOrThrow({where:{userId:"QA_TEST_admin"}}),teacher=await db.profesor.findFirstOrThrow({where:{usuario:{userId:"QA_TEST_teacher"}},include:{usuario:true}});
      const activity=await db.actividad.create({data:{id:randomUUID(),nombre:`${marker}_slot_teachers`,modalidadOperacion:"TURNO_RECURRENTE",duracionTurnoMinutos:30,categoriaActividadId:category.id,estado:"ACTIVA"}});
      const schedule=await db.horarioActividad.create({data:{actividadId:activity.id,establecimientoId:"qa-local-establishment",diaSemana:"SABADO",horaInicio:"13:00",horaFin:"14:00",duracionTurnoMinutos:30,cupoMaximo:5,profesores:{create:{profesorId:teacher.id,esPrincipal:true}}}});
      await db.actividadBorrador.create({data:{actividadId:activity.id,creadoPorId:admin.id,nombre:activity.nombre,estado:"PUBLICADO",publicadoAt:new Date(),payload:{__activity:{version:1,startDate:"2026-10-01",endDate:null,excludedDates:[],schedules:[{id:schedule.id,establecimientoId:schedule.establecimientoId,diaSemana:schedule.diaSemana,horaInicio:schedule.horaInicio,horaFin:schedule.horaFin,teacherAssignments:[{startTime:"13:00",endTime:"13:30",professorIds:[teacher.id]},{startTime:"13:30",endTime:"14:00",professorIds:[]}]}]}}}});
      const detail=(await q.call(`/api/citizen/activities/${activity.id}`,{role:"citizen"})).data;
      assert.deepEqual(detail.schedules[0].teacherAssignments,[{startTime:"13:00",endTime:"13:30",professors:[[teacher.usuario.nombre,teacher.usuario.apellido].filter(Boolean).join(" ")]},{startTime:"13:30",endTime:"14:00",professors:[]}]);
      assert.equal(await db.claseActividad.count({where:{horarioActividadId:schedule.id}}),0);
      return {activityId:activity.id,slotWithTeacher:true,slotWithoutTeacher:true,generatedClasses:0};
    });
  }finally{await db.$disconnect();await q.db.$disconnect();}
  assert.ok(results.every(r=>r.status==="PASS"),"Real regression failed; inspect evidence");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
