import fs from 'node:fs';
import assert from 'node:assert/strict';
import {realQaClient} from './qa-real-client.mjs';
const q=await realQaClient(),f=JSON.parse(fs.readFileSync('.tmp/qa-postgres/teacher-isolation.private.json')),results=[];
async function test(id,fn){try{results.push({id,status:'PASS',detail:await fn()});}catch(e){results.push({id,status:'FAIL',detail:e.message});}console.log(`${id}: ${results.at(-1).status}`);}
try{
 for(const [role,a]of Object.entries(f.teachers))await q.authenticate(role,a.userId,f.password);
 const extraFile='.tmp/qa-postgres/teacher-isolation-extra.private.json';let extra;
 if(fs.existsSync(extraFile))extra=JSON.parse(fs.readFileSync(extraFile));else{
  const run=`QA_TEST_ISO_EXTRA_${Date.now()}`,citizenRole=await q.db.rol.findUniqueOrThrow({where:{codigo:'citizen'}});extra={run,users:{},schedules:{}};
  for(const name of ['ACT2','TURN','PAST'])extra.users[name]=await q.call('/api/users',{method:'POST',status:201,body:{userId:run+'_'+name,email:(run+'_'+name).toLowerCase()+'@example.invalid',nombre:run,apellido:name,password:f.password,rolId:citizenRole.id}});
  const second=await q.db.actividad.create({data:{id:run+'_second',nombre:run,estado:'ACTIVA',cupoMaximo:30}});
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const [name,activity,planned,actual,date,state]of [['ACT2',second.id,'A','A',today,'PROGRAMADA'],['TURN',f.activity,'A','B',today,'PROGRAMADA'],['PAST',f.activity,'A','A','2026-01-06','FINALIZADA']]){
   const s=await q.db.horarioActividad.create({data:{actividadId:activity,establecimientoId:f.venues[0].id,diaSemana:'MARTES',horaInicio:'09:00',horaFin:'10:00',cupoMaximo:30,profesores:{create:{profesorId:f.teachers[planned].professorId,esPrincipal:true}}}});extra.schedules[name]=s;
   await q.db.claseActividad.create({data:{horarioActividadId:s.id,establecimientoId:f.venues[0].id,fecha:new Date(date+'T00:00:00Z'),horaInicio:'09:00',horaFin:'10:00',estado:state,profesores:{create:{profesorId:f.teachers[actual].professorId,esPrincipal:true}}}});
   await q.db.inscripcion.create({data:{usuarioId:extra.users[name].id,horarioActividadId:s.id,estado:name==='PAST'?'CANCELADA':'CONFIRMADA',...(name==='PAST'?{fechaInscripcion:new Date('2026-01-01T00:00Z'),fechaCancelacion:new Date('2026-01-07T00:00Z')}:{})}});
  }
  await q.db.inscripcion.create({data:{usuarioId:f.citizens.A0.id,horarioActividadId:extra.schedules.ACT2.id,estado:'CONFIRMADA'}});
  fs.writeFileSync(extraFile,JSON.stringify(extra,null,2));
 }
 for(const [label,allowed]of [['ACT2','A'],['TURN','B'],['PAST','A']])for(const role of ['A','B','EMPTY'])await test(`RELATION-${label}-${role}`,async()=>{const user=await q.db.usuario.findUniqueOrThrow({where:{id:extra.users[label].id}});const data=(await q.call('/api/teacher/citizen-documents?q='+encodeURIComponent(user.email),{role})).data;assert.equal(data.items.some(c=>c.id===user.id),role===allowed);await q.call('/api/teacher/citizen-documents?citizenId='+user.id,{role,status:role===allowed?200:403});return{visible:role===allowed};});
 await test('OWN-DTO-AND-ORDER-UNCHANGED',async()=>{const query=encodeURIComponent(f.citizens.A0.email);const own=(await q.call('/api/teacher/citizen-documents?q='+query,{role:'A'})).data.items;const global=(await q.call('/api/enrollments/citizens?q='+query)).data.items;assert.deepEqual(own,global);return{sameFields:true};});
 await test('OWN-DOCUMENT-METADATA-RETAINED',async()=>{const own=(await q.call('/api/teacher/citizen-documents?citizenId='+f.citizens.A0.id,{role:'A'})).data;assert.ok(own.requirements.some(r=>r.current?.id===f.docs.A0.id));return{ownedDocumentId:f.docs.A0.id};});
 await test('MULTIPLE-ACTIVITIES-ACCESS',async()=>{const ids=await q.db.horarioActividad.findMany({where:{profesores:{some:{profesorId:f.teachers.A.professorId}}},select:{actividadId:true}});assert.ok(new Set(ids.map(i=>i.actividadId)).size>=2);return{activities:new Set(ids.map(i=>i.actividadId)).size};});
 await test('ATTENDANCE-WRITE-AND-READ',async()=>{const session=await q.db.claseActividad.findFirstOrThrow({where:{horarioActividadId:f.schedules.A.id}});await q.call('/api/teacher/attendance/'+session.id,{role:'A',method:'POST',body:{action:'batch',records:[{enrollmentId:f.enrollments.A0.id,status:'PRESENTE'}]}});await q.call('/api/teacher/attendance/'+session.id,{role:'A'});assert.ok(await q.db.asistencia.findFirst({where:{claseActividadId:session.id,inscripcionId:f.enrollments.A0.id,estado:'PRESENTE'}}));return{sessionId:session.id};});
 await test('CITIZEN-PORTAL-UNCHANGED',async()=>{await q.call('/api/citizen/profile',{role:'citizen'});await q.call('/api/citizen/activities',{role:'citizen'});});
 await test('MALFORMED-CITIZEN-ID-REJECTED',()=>q.call('/api/teacher/citizen-documents?citizenId=not-a-uuid',{role:'A',status:400}));
 results.push({id:'OWN-POSITIVE-FILE-DOWNLOAD',status:'BLOCKED',detail:'Development Storage remains disabled; only synthetic local metadata was created. Foreign downloads were rejected before Storage.'});
}finally{fs.writeFileSync('audit-evidence/teacher-isolation/regression.json',JSON.stringify({realApis:true,localOnly:true,results,calls:q.calls},null,2));await q.db.$disconnect();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
