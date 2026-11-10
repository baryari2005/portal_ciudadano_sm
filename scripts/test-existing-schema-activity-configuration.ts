/* eslint-disable @typescript-eslint/no-explicit-any -- Transactional, isolated Prisma adapter; no database or network. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { publishedConfiguration, withConfiguration } from "../src/features/activity-configuration/helpers/activity-configuration";
import { readActivityConfiguration, writeActivityConfiguration } from "../src/features/activity-configuration/services/activity-configuration.server";
import { activityDraftPayloadSchema } from "../src/features/activity-workflow/schemas/activity-draft.schema";

const category="11111111-1111-4111-8111-111111111111";
let state={rows:new Map<string,any>(),activities:new Map<string,any>(),sequence:0};
let clock=Date.now(), failSchedule=false,failSync=false;
const stamp=()=>new Date(++clock);
const clone=<T,>(value:T):T=>structuredClone(value);
function matches(row:any,where:any){return (!where.id||where.id===row.id)&&(!where.actividadId||where.actividadId===row.actividadId)&&(!where.updatedAt||where.updatedAt.getTime()===row.updatedAt.getTime())&&(!Object.hasOwn(where,"publicadoAt")||row.publicadoAt===where.publicadoAt)&&(!where.estado||(typeof where.estado==="string"?where.estado===row.estado:where.estado.not!==row.estado));}
function noNewColumns(data:any){for(const key of ["fechaInicio","fechaFin","fechasExcluidas","distribucionDocente"])assert.equal(Object.hasOwn(data??{},key),false,`Forbidden database column ${key}`);}
const tx:any={
 $queryRaw:async()=>[],
 actividadBorrador:{
  findUnique:async({where}:any)=>clone([...state.rows.values()].find(row=>matches(row,where))??null),
  findUniqueOrThrow:async(args:any)=>{const row=await tx.actividadBorrador.findUnique(args);assert.ok(row);return row;},
  findMany:async({where}:any)=>clone([...state.rows.values()].filter(row=>matches(row,where))),
  create:async({data}:any)=>{const row={id:`draft-${++state.sequence}`,actividadId:null,nombre:"Actividad",modalidad:null,pasoActual:1,publicadoAt:null,createdAt:stamp(),updatedAt:stamp(),...clone(data)};state.rows.set(row.id,row);return clone(row);},
  updateMany:async({where,data}:any)=>{const row=[...state.rows.values()].find(row=>matches(row,where));if(!row)return{count:0};Object.assign(row,clone(data),{updatedAt:data.updatedAt??stamp()});return{count:1};},
  update:async(args:any)=>{assert.equal((await tx.actividadBorrador.updateMany(args)).count,1);return tx.actividadBorrador.findUnique({where:args.where});},
  deleteMany:async({where}:any)=>{const row=[...state.rows.values()].find(row=>matches(row,where));if(!row)return{count:0};state.rows.delete(row.id);return{count:1};},
 },
 actividad:{findUnique:async({where}:any)=>clone(state.activities.get(where.id)??null)},
 profesor:{findMany:async()=>[]},
};
const db:any={...tx,$transaction:async(callback:any)=>{const before=clone(state);try{return await callback(tx);}catch(error){state=before;throw error;}}};
async function getActividad(id:string,client:any){assert.equal(client,tx);return {...clone(state.activities.get(id)),fechaInicio:(await readActivityConfiguration(tx,id))?.startDate};}
const activityServices={
 getActividad,
 createActividad:async(input:any,actor:string,draftId:string,client:any)=>{
  assert.equal(client,tx,"Creation must reuse the publication transaction");
  const id=`activity-${++state.sequence}`;
  const {fechaInicio,fechaFin,fechasExcluidas,...scalars}=input;noNewColumns(scalars);
  state.activities.set(id,{...scalars,id,updatedAt:stamp(),publicosObjetivo:[],requisitos:[],horarios:[]});
  await tx.actividadBorrador.update({where:{id:draftId},data:{actividadId:id}});
  await writeActivityConfiguration(tx,id,{startDate:fechaInicio,endDate:fechaFin??null,excludedDates:fechasExcluidas??[]},actor);
  return getActividad(id,client);
 },
 patchActividad:async(id:string,input:any,actor:string,client:any)=>{
  assert.equal(client,tx,"Edits must reuse the publication transaction");
  const activity=state.activities.get(id);const {fechaInicio,fechaFin,fechasExcluidas,horarios,...scalars}=input;noNewColumns(scalars);
  Object.assign(activity,scalars,{updatedAt:stamp()});
  if(horarios)activity.horarios=horarios;
  if(fechaInicio!==undefined||fechaFin!==undefined||fechasExcluidas!==undefined)await writeActivityConfiguration(tx,id,{...(fechaInicio!==undefined?{startDate:fechaInicio}:{}),...(fechaFin!==undefined?{endDate:fechaFin}:{}),...(fechasExcluidas!==undefined?{excludedDates:fechasExcluidas}:{})},actor);
  return getActividad(id,client);
 },
};
const scheduleServices={
 assertActivityScheduleAvailability:async(_input:any,client:any)=>assert.equal(client,tx),
 createActivitySchedule:async(input:any,_audit:any,client:any)=>{
  assert.equal(client,tx,"Schedules must reuse the publication transaction");noNewColumns(input);if(failSchedule)throw new Error("schedule failure");
  const id=`schedule-${++state.sequence}`,record={...input,id,profesores:[],recursos:[],clases:[]};state.activities.get(input.actividadId).horarios.push(record);
  return{id,establishmentId:input.establecimientoId,day:input.diaSemana,startTime:input.horaInicio,endTime:input.horaFin,professors:[],activity:{name:"Actividad"},establishment:{name:"Sede"}};
 },
 updateActivitySchedule:async(id:string,input:any,_audit:any,_options:any,client:any)=>{assert.equal(client,tx);noNewColumns(input);const activity=[...state.activities.values()].find(a=>a.horarios.some((h:any)=>h.id===id));Object.assign(activity.horarios.find((h:any)=>h.id===id),input);return{id,professors:[],activity:{name:"Actividad"},establishment:{name:"Sede"}};},
};
const file=resolve("src/features/activity-workflow/services/activity-drafts.server.ts"),req=createRequire(file),workflow:any={};
const code=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
runInThisContext(`(function(exports,require){${code}\n})`,{filename:file})(workflow,(name:string)=>name==="@/lib/db"?{prisma:db}:name.includes("actividades.server")?activityServices:name.includes("activity-schedules.server")?scheduleServices:name.includes("activity-sessions.server")?{syncGeneratedSessionTeachers:async(_id:any,_assignments:any,client:any)=>{assert.equal(client,tx);if(failSync)throw new Error("sync failure");}}:name.includes("teacher-assignment-notifications.server")?{notifyTeacherAssignmentChanges:async()=>[]}:req(name));
const form=(end:string|null)=>activityDraftPayloadSchema.parse({nombre:"Yoga",categoriaActividadId:category,modalidadOperacion:"TURNO_RECURRENTE",duracionTurnoMinutos:30,generacionClasesDesde:"2026-11-01",generacionClasesHasta:end,fechasExcluidas:["2026-11-02"],schedules:[{establecimientoId:"venue",diaSemana:"LUNES",horaInicio:"09:00",horaFin:"10:00",cupoMaximo:12,duracionTurnoMinutos:30,profesorIds:[],teacherAssignments:[{startTime:"09:00",endTime:"09:30",professorIds:[]},{startTime:"09:30",endTime:"10:00",professorIds:[]}]}]});
async function main(){
 const legacy={payload:form("2028-11-01"),publicadoAt:new Date()};
 assert.equal(publishedConfiguration(legacy)?.startDate,"2026-11-01");
 assert.equal(publishedConfiguration({...legacy,publicadoAt:null}),null,"Pending draft is never published truth");
 const oldSchedule={...form(null).schedules[0]} as any;delete oldSchedule.establecimientoId;
 const oldPublished={payload:{...form(null),schedules:[oldSchedule]},publicadoAt:new Date()};
 const identities=[{id:"legacy-schedule",establecimientoId:"venue",diaSemana:"LUNES",horaInicio:"09:00",horaFin:"10:00"}];
 assert.equal(publishedConfiguration(oldPublished,identities)?.schedules[0].id,"legacy-schedule","Bind old venue-less payload only to an unambiguous stored schedule");
 assert.equal(publishedConfiguration(oldPublished,[...identities,{...identities[0],id:"ambiguous",establecimientoId:"other"}]),null,"Never guess between matching venues");

 assert.equal(publishedConfiguration({payload:{__activity:{version:1}},publicadoAt:new Date()}),null);
 assert.equal(Object.hasOwn(withConfiguration({__activity:{forged:true}},null),"__activity"),false);
 let activityId="";
 for(const end of ["2026-12-01","2027-05-01","2027-11-01","2028-11-01","2031-11-01",null]){
  const fresh=await workflow.createActivityDraft("admin"),saved=await workflow.saveActivityDraft(fresh.id,"admin",form(end),fresh.updatedAt.toISOString());
  const result=await workflow.publishActivityDraft(fresh.id,"admin",saved.updatedAt.toISOString());activityId=result.id;
  const configuration=await readActivityConfiguration(tx,activityId);
  assert.equal(configuration?.endDate,end);assert.equal(configuration?.schedules.length,1);assert.ok(configuration?.schedules[0].id);assert.equal(configuration?.schedules[0].teacherAssignments.length,2);
 }
 const before=await readActivityConfiguration(tx,activityId);
 let edit=await workflow.createActivityEditDraft(activityId,"admin");
 assert.equal(edit.payload.generacionClasesDesde,"2026-11-01");assert.equal(edit.payload.generacionClasesHasta,null);assert.deepEqual(edit.payload.fechasExcluidas,["2026-11-02"]);
 const saved=await workflow.saveActivityDraft(edit.id,"admin",{...edit.payload,generacionClasesHasta:"2035-11-01"},edit.updatedAt.toISOString());
 assert.deepEqual(await readActivityConfiguration(tx,activityId),before,"Autosave cannot change live validity");
 await workflow.deleteActivityDraft(edit.id,saved.updatedAt.toISOString());assert.deepEqual(await readActivityConfiguration(tx,activityId),before,"Discard must retain published settings");assert.equal(await workflow.getActivityDraft(edit.id),null);
 edit=await workflow.createActivityEditDraft(activityId,"admin");
 let changed=await workflow.saveActivityDraft(edit.id,"admin",{...edit.payload,generacionClasesHasta:"2028-11-01"},edit.updatedAt.toISOString());
 await workflow.publishActivityDraft(edit.id,"admin",changed.updatedAt.toISOString());assert.equal((await readActivityConfiguration(tx,activityId))?.endDate,"2028-11-01");
 edit=await workflow.createActivityEditDraft(activityId,"admin");changed=await workflow.saveActivityDraft(edit.id,"admin",{...edit.payload,generacionClasesHasta:null},edit.updatedAt.toISOString());await workflow.publishActivityDraft(edit.id,"admin",changed.updatedAt.toISOString());assert.equal((await readActivityConfiguration(tx,activityId))?.endDate,null);
 edit=await workflow.createActivityEditDraft(activityId,"admin");changed=await workflow.saveActivityDraft(edit.id,"admin",{...edit.payload,generacionClasesHasta:"2035-11-01",schedules:edit.payload.schedules.map((s:any)=>({...s,espacio:"Sala nueva"}))},edit.updatedAt.toISOString());
 const beforeFailure=clone(state.activities);const configurationBeforeFailure=await readActivityConfiguration(tx,activityId);failSync=true;
 await assert.rejects(workflow.publishActivityDraft(edit.id,"admin",changed.updatedAt.toISOString()),/sync failure/);failSync=false;
 assert.deepEqual(state.activities,beforeFailure);assert.deepEqual(await readActivityConfiguration(tx,activityId),configurationBeforeFailure,"Failed publication rolls back configuration too");
 const newDraft=await workflow.createActivityDraft("admin"),newSaved=await workflow.saveActivityDraft(newDraft.id,"admin",form(null),newDraft.updatedAt.toISOString()),count=state.activities.size;failSchedule=true;
 await assert.rejects(workflow.publishActivityDraft(newDraft.id,"admin",newSaved.updatedAt.toISOString()),/schedule failure/);failSchedule=false;
 assert.equal(state.activities.size,count);assert.equal(state.rows.get(newDraft.id).actividadId,null,"Failed creation must not retain a half-linked draft");
 console.log("OK: original-schema JSON storage; six durations; permanent schedule IDs and slot templates; autosave/discard isolation; finite/indefinite edits; atomic rollback on creation/edit failures; no inferred dates or new database columns.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
