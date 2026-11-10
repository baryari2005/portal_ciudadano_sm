import fs from 'node:fs';
import assert from 'node:assert/strict';
import {realQaClient} from './qa-real-client.mjs';
const q=await realQaClient(),results=[];
async function test(id,fn){try{results.push({id,status:'PASS',detail:await fn()});}catch(e){results.push({id,status:'FAIL',detail:e.message});}console.log(`${id}: ${results.at(-1).status}`);}
try{
 for(const kind of ['activities','enrollments','attendance','establishments','documentation'])for(const role of ['admin','teacher','reception','citizen'])await test(`REPORT-${kind}-${role}`,async()=>{await q.call(`/api/reports/${kind}`,{role,status:role==='admin'?200:403});return{expected:role==='admin'?200:403};});
 const teacher=await q.db.profesor.findUniqueOrThrow({where:{usuarioId:q.users.teacher.id}});
 const other=await q.db.usuario.findFirstOrThrow({where:{userId:{startsWith:'QA_TEST'},rol:{codigo:'citizen'},inscripciones:{none:{OR:[{horarioActividad:{clases:{some:{profesores:{some:{profesorId:teacher.id}}}}}},{horarios:{some:{horarioActividad:{clases:{some:{profesores:{some:{profesorId:teacher.id}}}}}}}}]}}}});
 await test('TEACHER-FOREIGN-DOCUMENT-DETAIL-DENIED',async()=>{await q.call(`/api/teacher/citizen-documents?citizenId=${other.id}`,{role:'teacher',status:403});return{denied:true};});
 await test('TEACHER-FOREIGN-DOCUMENT-SEARCH-SCOPED',async()=>{const result=await q.call(`/api/teacher/citizen-documents?q=${encodeURIComponent(other.email)}`,{role:'teacher'});const items=result.data.items??result.data;assert.ok(!items.some(u=>u.id===other.id),'Document selector returns an unassigned citizen; individual detail remains forbidden. Existing non-auth business endpoint, not modified.');return{scoped:true};});
}finally{fs.writeFileSync('audit-evidence/auth-persistence/critical-scopes.json',JSON.stringify({localOnly:true,apiInterception:false,results,calls:q.calls},null,2));await q.db.$disconnect();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
