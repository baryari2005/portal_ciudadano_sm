import fs from 'node:fs';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { randomUUID,randomBytes } from 'node:crypto';
import { realQaClient } from './qa-real-client.mjs';
const q=await realQaClient(),phase=process.argv[2]??'after',out='audit-evidence/auth-persistence',results=[];
const key=new TextEncoder().encode(process.env.JWT_SECRET||'dev-secret-change-me');
async function test(id,fn){try{results.push({id,status:'PASS',detail:await fn()});}catch(e){results.push({id,status:'FAIL',detail:e.message});}console.log(`${id}: ${results.at(-1).status}`);}
const request=(token,route='/api/auth/me')=>fetch('http://localhost:3000'+route,{headers:{Authorization:`Bearer ${token}`}});
try{
 const account=JSON.parse(fs.readFileSync('.tmp/qa-postgres/accounts.private.json')).find(a=>a.role==='citizen');
 const login=await fetch('http://localhost:3000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:account.userId,password:account.password})});const {token}=await login.json();assert.ok(token);
 for(const [id,fixture]of [
  ['expired',await new SignJWT({uid:q.users.citizen.id}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(Math.floor(Date.now()/1000)-30).sign(key)],
  ['without-expiry',await new SignJWT({uid:q.users.citizen.id}).setProtectedHeader({alg:'HS256'}).setIssuedAt().sign(key)],
  ['wrong-signature',await new SignJWT({uid:q.users.citizen.id}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1m').sign(new TextEncoder().encode(randomUUID()))],
  ['altered',token.split('.').map((p,i)=>i===1?Buffer.from(JSON.stringify({uid:randomUUID(),exp:9999999999})).toString('base64url'):p).join('.')],
  ['unsigned',Buffer.from(JSON.stringify({alg:'none'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({uid:q.users.citizen.id})).toString('base64url')+'.']
 ])await test(`TOKEN-${id}-DENIED`,async()=>{assert.equal((await request(fixture)).status,401);return{rejected:true};});
 for(const role of ['citizen','teacher','reception'])await test(`ROLE-${role}-ADMIN-DENIED`,()=>q.call('/api/dashboard/summary',{role,status:403}));
 const password=randomBytes(24).toString('base64url'),run=`QA_TEST_AUTH_${Date.now()}`,user=await q.call('/api/users',{method:'POST',status:201,body:{userId:run,email:`${run}@example.invalid`,nombre:'QA_TEST Autenticación',password,rolId:q.users.citizen.rol.id}});
 const logged=await(await fetch('http://localhost:3000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:run,password})})).json();
 await q.call(`/api/users/${user.id}`,{method:'PATCH',body:{estado:'BLOQUEADO'}});
 await test('BLOCKED-ACCOUNT-PROTECTED-DENIED',async()=>{assert.equal((await request(logged.token,'/api/citizen/profile')).status,403);return{denied:true};});
 const deleted=await q.call('/api/users',{method:'POST',status:201,body:{userId:run+'_deleted',email:`${run}_deleted@example.invalid`,nombre:'QA_TEST Desactivado',password,rolId:q.users.citizen.rol.id}});
 const previous=await(await fetch('http://localhost:3000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:run+'_deleted',password})})).json();
 await q.call(`/api/users/${deleted.id}`,{method:'DELETE',status:204});
 await test('DEACTIVATED-ACCOUNT-TOKEN-DENIED',async()=>{assert.equal((await request(previous.token)).status,401);return{denied:true};});
 results.push({id:'JWT-SERVER-REVOCATION',status:'BLOCKED',detail:'No dedicated persistent session storage in existing schema; implementation stopped as requested.'});
 results.push({id:'JWT-REVOCATION-AFTER-RESTART',status:'BLOCKED',detail:'Requires persistent individual session revocation, not implemented without schema authorization.'});
 results.push({id:'REFRESH-REVOKED-SESSION',status:'NOT TESTED',detail:'No refresh token or refresh endpoint exists; no renewal mechanism added.'});
}finally{fs.writeFileSync(`${out}/security-${phase}.json`,JSON.stringify({realApis:true,localDatabase:true,results,calls:q.calls},null,2));await q.db.$disconnect();}
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
