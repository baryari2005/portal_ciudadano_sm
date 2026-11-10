/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated module loaders exercise actual request code without network access. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
import ts from 'typescript';
import { NextRequest } from 'next/server';
import { withDefaultDashboardDates } from '../src/features/dashboard/schemas/dashboard-filters.schema';

function load(file:string,overrides:Record<string,unknown>){
 const path=resolve(file),localRequire=createRequire(path),exports:any={};
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInThisContext(`(function(exports,require){${code}\n})`,{filename:path})(exports,(name:string)=>name in overrides?overrides[name]:localRequire(name));
 return exports;
}
async function main(){
 assert.deepEqual(withDefaultDashboardDates({from:'2026-09-26',to:'2026-10-25'}),{from:'2026-09-26',to:'2026-10-25'});
 assert.throws(()=>withDefaultDashboardDates({from:'2026-02-30',to:'2026-10-25'}));
 assert.throws(()=>withDefaultDashboardDates({from:'2030-01-01'}),'Validate ranges after assigning default dates');
 assert.throws(()=>withDefaultDashboardDates({from:'2026-10-25',to:'2026-09-26'}));
 const requests:any[]=[];
 let fail=false;
 const client=load('src/features/citizen/services/citizen.service.ts',{'@/lib/axios':{axiosInstance:{
   get:async(url:string,config:unknown)=>{requests.push({url,config});if(fail)throw new Error('request failed');return{data:{data:{total:0,items:[]}}};},
   post:async()=>{throw new Error('Unexpected duplicate materialization request');},
 }}});
 const signal=new AbortController().signal;
 await client.loadCitizenSchedule(['2031-06','2031-07'],'2031-06-01','2031-07-31',signal);
 assert.equal(requests.length,1,'Exactly one bounded GET; no monthly POST followed by another generation');
 assert.deepEqual(requests[0].config,{params:{dateFrom:'2031-06-01',dateTo:'2031-07-31'},signal});
 fail=true;
 await assert.rejects(client.loadCitizenSchedule('2031-06','2031-06-01','2031-06-30',signal),/request failed/);
 let authenticated=true;
 const server=load('src/app/api/dashboard/summary/route.ts',{
   '@/lib/server-auth':{requireAuth:async()=>{if(!authenticated)throw new Error('UNAUTHORIZED');return {id:'admin',userId:'admin',rol:{id:1,codigo:'admin',nombre:'Administrador'},permisos:[]};}},
   '@/features/dashboard/services/dashboard.server':{getDashboardSummary:async()=>({current:{}})},
 });
 assert.equal((await server.GET(new NextRequest('http://local/api/dashboard/summary?from=2026-02-30&to=2026-10-25'))).status,400);
 assert.equal((await server.GET(new NextRequest('http://local/api/dashboard/summary?from=2026-09-26&to=2026-10-25'))).status,200);
 authenticated=false;
 assert.equal((await server.GET(new NextRequest('http://local/api/dashboard/summary'))).status,401);
 console.log('OK: dashboard date/default validation, 400/200/401 responses, one bounded calendar GET, error propagation and no duplicate generation request.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
