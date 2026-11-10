import fs from 'node:fs';
import assert from 'node:assert/strict';
import { realQaClient } from './qa-real-client.mjs';
const q=await realQaClient(),results=[];
try{
 for(const account of JSON.parse(fs.readFileSync('.tmp/qa-postgres/accounts.private.json'))){
  const response=await fetch('http://localhost:3000/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:account.userId,password:account.password})});assert.equal(response.status,200);
  const {token}=await response.json(),[header,payload]=token.split('.').slice(0,2).map(p=>JSON.parse(Buffer.from(p,'base64url')));
  assert.equal(payload.exp-payload.iat,172800);assert.equal(header.alg,'HS256');
  results.push({role:account.role,status:'PASS',algorithm:header.alg,lifetimeSeconds:payload.exp-payload.iat,hasSessionId:!!(payload.sid||payload.jti),authCookieIssued:!!response.headers.get('set-cookie')});
 }
 fs.writeFileSync('audit-evidence/auth-persistence/policy.json',JSON.stringify({results,tokensSaved:false,refreshImplemented:false,logoutEndpointImplemented:false},null,2));console.log(JSON.stringify(results));
}finally{await q.db.$disconnect();}
