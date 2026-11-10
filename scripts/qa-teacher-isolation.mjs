import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {realQaClient} from './qa-real-client.mjs';
const q=await realQaClient(),phase=process.argv[2]??'after',out='audit-evidence/teacher-isolation',file='.tmp/qa-postgres/teacher-isolation.private.json',results=[];
let f;
async function test(id,fn){try{results.push({id,status:'PASS',detail:await fn()});}catch(e){results.push({id,status:'FAIL',detail:e.message});}console.log(`${id}: ${results.at(-1).status}`);}
try{
 const context=await q.db.$queryRaw`SELECT current_database() AS database,inet_server_port() AS port`;
 assert.equal(context[0].database,'mas_sanmiguel_qa');assert.equal(context[0].port,55432);
 if(fs.existsSync(file))f=JSON.parse(fs.readFileSync(file));else{
  const run=`QA_TEST_ISO_${Date.now()}`,password=randomBytes(24).toString('base64url'),teacherRole=await q.db.rol.findUniqueOrThrow({where:{codigo:'teacher'}}),citizenRole=await q.db.rol.findUniqueOrThrow({where:{codigo:'citizen'}});
  f={run,password,teachers:{},citizens:{},schedules:{},enrollments:{},docs:{}};
  async function person(label,teacher=false){const userId=run+'_'+label;const user=await q.call('/api/users',{method:'POST',status:201,body:{userId,email:userId.toLowerCase()+'@example.invalid',password,nombre:run,apellido:label,documento:'9'+String(Date.now()).slice(-9)+String(Object.keys(f.citizens).length).padStart(2,'0'),rolId:teacher?teacherRole.id:citizenRole.id,...(teacher?{professorProfile:{especialidad:run}}:{})}});return{...user,userId,email:userId.toLowerCase()+'@example.invalid',professorId:teacher?(await q.db.profesor.findUniqueOrThrow({where:{usuarioId:user.id}})).id:undefined};}
  for(const name of ['A','B','EMPTY'])f.teachers[name]=await person('Teacher'+name,true);
  for(const name of ['A0','A1','A2','A3','A4','A5','A6','A7','B0','B1','SHARED','NONE','MULTI','HISTORY','SCHEDULE_ONLY','OPTIONAL'])f.citizens[name]=await person(name);
  const venues=[];for(let i=0;i<2;i++)venues.push(await q.db.establecimiento.create({data:{id:run+'_venue'+i,nombre:run+'_venue'+i,direccion:run+'_Street'+i}}));f.venues=venues;
  const activity=await q.db.actividad.create({data:{id:run+'_activity',nombre:run,estado:'ACTIVA',cupoMaximo:50}});f.activity=activity.id;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const [label,teachers,venue,withClass]of [['A',['A'],0,true],['B',['B'],0,true],['SHARED',['A','B'],0,true],['AWAY',['B'],1,true],['SCHEDULE_ONLY',['A'],0,false],['OPTIONAL',[],0,true]]){
   const s=await q.db.horarioActividad.create({data:{actividadId:activity.id,establecimientoId:venues[venue].id,diaSemana:'MARTES',horaInicio:'08:00',horaFin:'09:00',cupoMaximo:50,profesores:{create:teachers.map((t,i)=>({profesorId:f.teachers[t].professorId,esPrincipal:i===0}))}}});f.schedules[label]=s;
   if(withClass)await q.db.claseActividad.create({data:{horarioActividadId:s.id,establecimientoId:venues[venue].id,fecha:new Date(today+'T00:00:00Z'),horaInicio:'08:00',horaFin:'09:00',profesores:{create:teachers.map((t,i)=>({profesorId:f.teachers[t].professorId,esPrincipal:i===0}))}}});
  }
  for(const [label,schedule,status]of [...Array.from({length:8},(_,i)=>['A'+i,'A','CONFIRMADA']),['B0','B','CONFIRMADA'],['B1','AWAY','CONFIRMADA'],['SHARED','SHARED','CONFIRMADA'],['MULTI','B','CONFIRMADA'],['HISTORY','A','CANCELADA'],['SCHEDULE_ONLY','SCHEDULE_ONLY','CONFIRMADA'],['OPTIONAL','OPTIONAL','CONFIRMADA']])f.enrollments[label]=await q.db.inscripcion.create({data:{usuarioId:f.citizens[label].id,horarioActividadId:f.schedules[schedule].id,estado:status}});
  await q.db.inscripcionHorario.create({data:{inscripcionId:f.enrollments.MULTI.id,horarioActividadId:f.schedules.A.id}});
  const requirement=await q.db.requisito.create({data:{nombre:run,slug:run.toLowerCase(),tipo:'DOCUMENTO',requiereDocumento:true,documentoPersonal:true}});
  for(const label of ['A0','B0']){
   const data={requisitoId:requirement.id,version:1,nombreOriginal:run+'.pdf',storagePath:'QA_TEST/'+run+'/'+label+'.pdf',mimeType:'application/pdf',tamanioBytes:20,requisitoNombreSnapshot:run,subidoPorId:f.citizens[label].id};
   f.docs[label]=await q.db.documentoUsuario.create({data:{...data,usuarioId:f.citizens[label].id}});
   f.docs[label+'-enrollment']=await q.db.documentoInscripcion.create({data:{...data,inscripcionId:f.enrollments[label].id,obligatorioSnapshot:true}});
  }
  fs.writeFileSync(file,JSON.stringify(f,null,2));
 }
 for(const [name,a]of Object.entries(f.teachers))await q.authenticate(name,a.userId,f.password);
 const search=async(role,value,params='')=>(await q.call('/api/teacher/citizen-documents?q='+encodeURIComponent(value)+params,{role})).data;
 await test('FOREIGN-EMAIL-HIDDEN',async()=>{const d=await search('A',f.citizens.B0.email);assert.equal(d.items.length,0);return{items:0};});
 await test('FOREIGN-ID-403',()=>q.call('/api/teacher/citizen-documents?citizenId='+f.citizens.B0.id,{role:'A',status:403}));
 if(phase==='before'){
  await test('OWN-STUDENT-UNCHANGED',async()=>assert.ok((await search('A',f.citizens.A0.email)).items.some(c=>c.id===f.citizens.A0.id)));
 }else{
  const own={A:['A0','A1','A2','A3','A4','A5','A6','A7','SHARED','MULTI','HISTORY'],B:['B0','B1','SHARED','MULTI'],EMPTY:[]};
  for(const role of ['A','B','EMPTY'])for(const [label,user]of Object.entries(f.citizens))await test(`SEARCH-${role}-${label}`,async()=>{const d=await search(role,user.email);assert.equal(d.items.some(c=>c.id===user.id),own[role].includes(label));return{visible:own[role].includes(label)};});
  for(const field of ['nombre','apellido','documento','email','userId'])await test('FOREIGN-FIELD-'+field,async()=>{const user=await q.db.usuario.findUniqueOrThrow({where:{id:f.citizens.B0.id}});const d=await search('A',user[field]);assert.ok(!d.items.some(c=>c.id===user.id));return{hidden:true};});
  for(const role of ['A','B','EMPTY'])await test('PAGINATION-'+role,async()=>{const found=[],first=await search(role,f.run,'&page=1&pageSize=3');assert.equal(first.meta.total,own[role].length);for(let page=1;page<=first.meta.pageCount;page++){const d=await search(role,f.run,`&page=${page}&pageSize=3`);assert.equal(d.meta.page,page);found.push(...d.items.map(c=>c.id));}assert.deepEqual(new Set(found),new Set(own[role].map(label=>f.citizens[label].id)));return{total:found.length,pageCount:first.meta.pageCount};});
  for(const role of ['A','B','EMPTY'])for(const label of ['A0','B0','SHARED','HISTORY','MULTI'])await test(`DIRECT-${role}-${label}`,()=>q.call('/api/teacher/citizen-documents?citizenId='+f.citizens[label].id,{role,status:own[role].includes(label)?200:403}));
  for(const role of ['A','B','EMPTY'])for(const label of ['A0','B0']){
   await test(`ENROLLMENT-DOC-${role}-${label}`,()=>q.call('/api/teacher/enrollment-documents?enrollmentId='+f.enrollments[label].id,{role,status:own[role].includes(label)?200:403}));
   if(!own[role].includes(label))for(const [route,id]of [['citizen-documents',f.docs[label].id],['enrollment-documents',f.docs[label+'-enrollment'].id]])await test(`DOWNLOAD-${route}-${role}-${label}`,()=>q.call(`/api/teacher/${route}/${id}/download`,{role,status:403}));
  }
  for(const role of ['admin','reception','citizen'])for(const route of ['citizen-documents?q='+f.run,'citizen-documents?citizenId='+f.citizens.A0.id,'enrollment-documents?enrollmentId='+f.enrollments.A0.id,`citizen-documents/${f.docs.A0.id}/download`,`enrollment-documents/${f.docs['A0-enrollment'].id}/download`])await test(`ROLE-${role}-${route.split('?')[0]}`,()=>q.call('/api/teacher/'+route,{role,status:403}));
  for(const params of [`&professorId=${f.teachers.B.professorId}`,`&userId=${f.teachers.B.id}`,'&status=CONFIRMADA&sortOrder=desc',`&activityId=${f.activity}`,`&establishmentId=${f.venues[1].id}`])await test('TAMPER-'+params,async()=>{const d=await q.call('/api/teacher/citizen-documents?q='+encodeURIComponent(f.citizens.B0.email)+params,{role:'A',status:params.includes('establishmentId')?403:200});if(d.data)assert.equal(d.data.items.length,0);return{noLeak:true};});
  for(const params of ['&page=0','&page=-1','&page=NaN','&pageSize=100000'])await test('INVALID-PAGE-'+params,()=>q.call('/api/teacher/citizen-documents?q='+f.run+params,{role:'A',status:400}));
  await test('ANONYMOUS-DENIED',async()=>assert.equal((await fetch('http://localhost:3000/api/teacher/citizen-documents?q='+f.run)).status,401));
  await test('RECEPTION-GLOBAL-SEARCH-UNCHANGED',async()=>{const d=await q.call('/api/user-documents/citizens?q='+encodeURIComponent(f.citizens.B0.email),{role:'reception'});assert.ok(d.data.items.some(c=>c.id===f.citizens.B0.id));});
  await test('ADMIN-GLOBAL-SEARCH-UNCHANGED',async()=>{const d=await q.call('/api/enrollments/citizens?q='+encodeURIComponent(f.citizens.B0.email));assert.ok(d.data.items.some(c=>c.id===f.citizens.B0.id));});
  for(const [role,route]of [['A','summary'],['A','classes'],['A','enrollees'],['EMPTY','summary']])await test('REGRESSION-'+role+'-'+route,()=>q.call('/api/teacher/'+route,{role}));
 }
}finally{fs.writeFileSync(`${out}/${phase}.json`,JSON.stringify({localOnly:true,realApis:true,results,fixtures:f?{run:f.run,teachers:f.teachers,citizens:f.citizens,schedules:f.schedules,enrollments:f.enrollments,docs:f.docs}:null,calls:q.calls},null,2));await q.db.$disconnect();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
