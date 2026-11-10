import fs from 'node:fs';
import assert from 'node:assert/strict';
import { realQaClient } from './qa-real-client.mjs';
const output='audit-evidence/teacher-access';fs.mkdirSync(output,{recursive:true});
const q=await realQaClient(),results=[];
async function test(id,fn){try{results.push({id,status:'PASS',detail:await fn()});}catch(e){results.push({id,status:'FAIL',detail:e.message});}}
try{
 const accountFile='.tmp/qa-postgres/teacher-access.accounts.private.json';
 let accounts;
 if(fs.existsSync(accountFile))accounts=JSON.parse(fs.readFileSync(accountFile));
 else{
  const existing=JSON.parse(fs.readFileSync('.tmp/qa-postgres/accounts.private.json')).find(a=>a.role==='teacher');
  const userId=`QA_TEST_teacher_empty_${Date.now()}`,password=existing.password;
  const user=await q.call('/api/users',{method:'POST',status:201,body:{userId,password,email:`${userId}@example.invalid`,nombre:'QA_TEST Profesor',apellido:'Sin asignaciones',rolId:q.users.teacher.rol.id,professorProfile:{especialidad:'QA_TEST'}}});
  accounts={assigned:existing,empty:{role:'teacher',userId,password,id:user.id}};fs.writeFileSync(accountFile,JSON.stringify(accounts,null,2));
 }
 for(const scenario of ['assigned','empty']){
  const account=accounts[scenario];await q.authenticate('teacher',account.userId,account.password);
  const profile=await q.db.profesor.findUniqueOrThrow({where:{usuarioId:q.users.teacher.id},select:{id:true,estado:true,_count:{select:{horarios:true,clases:true}}}});
  await test(`${scenario}-profile`,async()=>{const result=await q.call('/api/teacher/profile',{role:'teacher'});assert.equal(profile.estado,'ACTIVO');if(scenario==='empty')assert.deepEqual(profile._count,{horarios:0,clases:0});else assert.ok(profile._count.horarios+profile._count.clases>0);return{profileCounts:profile._count,apiStatus:200};});
  let venues;
  await test(`${scenario}-venues`,async()=>{venues=(await q.call('/api/teacher/establishments',{role:'teacher'})).data;assert.ok(Array.isArray(venues));assert.equal(venues.length===0,scenario==='empty');return{venues};});
  for(const endpoint of ['summary','schedules','classes','sessions','enrollees'])await test(`${scenario}-${endpoint}`,async()=>{const result=await q.call(`/api/teacher/${endpoint}`,{role:'teacher'});if(scenario==='empty'){const d=result.data;if(endpoint==='summary'){assert.equal(d.todaySessions,0);assert.equal(d.upcomingSessions,0);assert.equal(d.nextSession,null);}else assert.equal((Array.isArray(d)?d:d.items).length,0);}return{status:200,data:result};});
  const foreign=await q.db.establecimiento.findFirst({where:{id:{notIn:venues.map(v=>v.id)}}});
  if(foreign)await test(`${scenario}-foreign-venue`,async()=>{await q.call(`/api/teacher/classes?establishmentId=${foreign.id}`,{role:'teacher',status:403});return{denied:true};});
  const other=await q.db.claseActividad.findFirst({where:{profesores:{none:{profesorId:profile.id}}},select:{id:true}});
  if(other)for(const route of [`classes/${other.id}`,`attendance/${other.id}`])await test(`${scenario}-foreign-${route.split('/')[0]}`,async()=>{await q.call(`/api/teacher/${route}`,{role:'teacher',status:403});return{denied:true};});
  const stranger=await q.db.usuario.findFirst({where:{userId:{startsWith:'QA_TEST'},rol:{codigo:'citizen'},id:{not:q.users.teacher.id},inscripciones:{none:{OR:[{horarioActividad:{clases:{some:{profesores:{some:{profesorId:profile.id}}}}}},{horarios:{some:{horarioActividad:{clases:{some:{profesores:{some:{profesorId:profile.id}}}}}}}}]}}},select:{id:true}});
  if(stranger)await test(`${scenario}-foreign-citizen`,async()=>{await q.call(`/api/teacher/enrollees/${stranger.id}`,{role:'teacher',status:403});return{denied:true};});
  if(scenario==='assigned'){
   const own=await q.db.claseActividad.findFirst({where:{profesores:{some:{profesorId:profile.id}}},select:{id:true}});
   await test('assigned-own-classes',async()=>{await q.call(`/api/teacher/classes/${own.id}`,{role:'teacher'});return{allowed:true};});
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const ownToday=await q.db.claseActividad.findFirst({where:{fecha:new Date(`${today}T00:00:00.000Z`),profesores:{some:{profesorId:profile.id}}},select:{id:true}});
   if(ownToday)await test('assigned-own-attendance',async()=>{await q.call(`/api/teacher/attendance/${ownToday.id}`,{role:'teacher'});return{allowed:true,date:today};});
   else results.push({id:'assigned-own-attendance',status:'BLOCKED',detail:'No existing assigned class on the current local date; no attendance policy changed.'});
  }
 }
 for(const endpoint of ['profile','establishments','summary','classes'])await test(`anonymous-${endpoint}`,async()=>{assert.equal((await fetch(`http://localhost:3000/api/teacher/${endpoint}`)).status,401);return{denied:true};});
}finally{fs.writeFileSync(`${output}/api-results.json`,JSON.stringify({database:'127.0.0.1:55432/mas_sanmiguel_qa',realApis:true,results,calls:q.calls},null,2));await q.db.$disconnect();}
console.log(JSON.stringify(results.map(({id,status,detail})=>({id,status,...(status==='FAIL'?{detail}:{})})),null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
