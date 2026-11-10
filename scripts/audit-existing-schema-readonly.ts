/* eslint-disable @typescript-eslint/no-explicit-any -- Read-only service/handler loader, isolated authentication and generation guard. */
import {PrismaClient,Prisma} from "@prisma/client";
import {NextRequest} from "next/server";
import ts from "typescript";
import {readFileSync,readdirSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
import {runInThisContext} from "node:vm";
function load(file:string,overrides:Record<string,unknown>){const path=resolve(file),req=createRequire(path),exports:any={};const code=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;runInThisContext(`(function(exports,require){${code}\n})`,{filename:path})(exports,(name:string)=>name in overrides?overrides[name]:req(name));return exports;}
const db=new PrismaClient({log:[]});
async function main(){await db.$transaction(async tx=>{
 await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
 const mode=await tx.$queryRawUnsafe("SHOW transaction_read_only");
 const columns=await tx.$queryRaw<Array<{table_name:string;column_name:string}>>`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public'`;
 const missingColumns=Prisma.dmmf.datamodel.models.flatMap(model=>model.fields.filter(field=>field.kind!=="object"&&!columns.some(column=>column.table_name===(model.dbName??model.name)&&column.column_name===(field.dbName??field.name))).map(field=>({table:model.dbName??model.name,column:field.dbName??field.name})));
 const migrations=await tx.$queryRaw<Array<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null}>>`SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations"`;
 const pendingMigrations=readdirSync("prisma/migrations",{withFileTypes:true}).filter(entry=>entry.isDirectory()&&!migrations.some(m=>m.migration_name===entry.name&&m.finished_at&&!m.rolled_back_at)).map(entry=>entry.name);
 const activityServices=load("src/features/actividades/services/actividades.server.ts",{"@/lib/db":{prisma:tx}});
 const activities=await activityServices.listActividades();
 const venue=await tx.establecimiento.findFirst({where:{activo:true,estado:{not:"inactivo"}},select:{id:true}});if(!venue)throw new Error("No active establishment for the read-only check");
 let candidateSchedules=0;
 // Execute the actual generator's initial SELECT, then stop before any materialization.
 const sessions=load("src/features/activity-sessions/services/activity-sessions.server.ts",{"@/lib/db":{prisma:{horarioActividad:{findMany:async(args:any)=>{candidateSchedules=(await tx.horarioActividad.findMany(args)).length;return [];}}}}});
 const accessServices=load("src/features/access/services/access.server.ts",{"@/lib/db":{prisma:tx},"@/features/activity-sessions/services/activity-sessions.server":sessions});
 const auth={requireAuth:async()=>({id:"isolated-readonly-auth"}),requirePermission:()=>{}};
 const activityRoute=load("src/app/api/actividades/route.ts",{"@/lib/server-auth":auth,"@/features/actividades/services/actividades.server":activityServices});
 const accessRoute=load("src/app/api/access/route.ts",{"@/lib/server-auth":auth,"@/features/access/services/access.server":accessServices});
 const activityResponse=await activityRoute.GET(new NextRequest("http://localhost/api/actividades"));
 const accessResponse=await accessRoute.GET(new NextRequest(`http://localhost/api/access?view=home&establishmentId=${venue.id}`));
 const access=await accessResponse.json();
 const result={mode,missingColumns,pendingMigrations,generatedSchemaMatches:readFileSync("prisma/schema.prisma","utf8").replace(/\s+/g,"")===readFileSync("node_modules/.prisma/client/schema.prisma","utf8").replace(/\s+/g,""),activities:{count:activities.length,confirmed:activities.filter((a:any)=>a.vigenciaConfirmada).length,unconfirmed:activities.filter((a:any)=>!a.vigenciaConfirmada).length},activitiesStatus:activityResponse.status,receptionReadStatus:accessResponse.status,candidateSchedules,upcoming:access.data?.upcomingSessions?.length,authentication:"ISOLATED_NOT_TESTED",classMaterialization:"DISABLED_NOT_TESTED",productionWrites:false};
 console.log(JSON.stringify(result,null,2));
 if(missingColumns.length||activityResponse.status!==200||accessResponse.status!==200)process.exitCode=1;
},{timeout:60000});}
main().catch(error=>{console.error(JSON.stringify({code:error.code,meta:error.meta,name:error.name}));process.exitCode=1;}).finally(()=>db.$disconnect());
