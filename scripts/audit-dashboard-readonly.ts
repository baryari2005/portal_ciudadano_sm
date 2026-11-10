import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';
import { NextRequest } from 'next/server';
import ts from 'typescript';
import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/db';

// All database operations below are SELECTs. No service that materializes classes is invoked.
async function main(){
 const columns=await prisma.$queryRaw<Array<{table_name:string;column_name:string;is_nullable:string}>>`SELECT table_name,column_name,is_nullable FROM information_schema.columns WHERE table_schema='public'`;
 const missingColumns=Prisma.dmmf.datamodel.models.flatMap(model=>model.fields.filter(field=>field.kind!=='object'&&!columns.some(column=>column.table_name===(model.dbName??model.name)&&column.column_name===(field.dbName??field.name))).map(field=>({table:model.dbName??model.name,column:field.dbName??field.name})));
 const migrations=await prisma.$queryRaw<Array<{migration_name:string;finished_at:Date|null;rolled_back_at:Date|null}>>`SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations"`;
 const pendingMigrations=readdirSync('prisma/migrations',{withFileTypes:true}).filter(item=>item.isDirectory()&&!migrations.some(applied=>applied.migration_name===item.name&&applied.finished_at)).map(item=>item.name);
 const duplicates=await prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) AS count FROM (SELECT "horarioActividadId", fecha, "horaInicio" FROM "ClaseActividad" GROUP BY "horarioActividadId", fecha, "horaInicio" HAVING COUNT(*)>1) duplicated`;
 const orphanSchedules=await prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) AS count FROM "ActividadHorario" h LEFT JOIN "Actividad" a ON a.id=h."actividadId" WHERE a.id IS NULL`;
 const orphanClasses=await prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) AS count FROM "ClaseActividad" c LEFT JOIN "ActividadHorario" h ON h.id=c."horarioActividadId" WHERE h.id IS NULL`;
 const orphanTeachers=await prisma.$queryRaw<Array<{count:bigint}>>`SELECT COUNT(*) AS count FROM "ClaseActividadProfesor" l LEFT JOIN "Profesor" p ON p.id=l."profesorId" LEFT JOIN "ClaseActividad" c ON c.id=l."claseActividadId" WHERE p.id IS NULL OR c.id IS NULL`;
 const endpoints:Array<{name:string;status:number;hasSummary:boolean}>=[];
 const result={clientVersion:Prisma.prismaVersion.client,generatedSchemaMatches:readFileSync('prisma/schema.prisma','utf8').replace(/\s+/g,'')===readFileSync('node_modules/.prisma/client/schema.prisma','utf8').replace(/\s+/g,''),missingColumns,pendingMigrations,failedMigrations:migrations.filter(item=>!item.finished_at&&!item.rolled_back_at).map(item=>item.migration_name),integrity:{duplicateClasses:Number(duplicates[0].count),orphanSchedules:Number(orphanSchedules[0].count),orphanClasses:Number(orphanClasses[0].count),orphanTeacherLinks:Number(orphanTeachers[0].count)},endpoints,invalidDateStatus:0,unauthenticatedStatus:0};
 let authenticated=true;
 const file=resolve('src/app/api/dashboard/summary/route.ts'),localRequire=createRequire(file),summary={} as {GET:(request:NextRequest)=>Promise<Response>};
 const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInThisContext(`(function(exports,require){${code}\n})`,{filename:file})(summary,(name:string)=>name==='@/lib/server-auth'?{requireAuth:async()=>{if(!authenticated)throw new Error('UNAUTHORIZED');return{id:'readonly-test'};}}:localRequire(name));
 for(const name of ['summary','capacity','activity-trends','attendance-trends']){
   const path=resolve(`src/app/api/dashboard/${name}/route.ts`);
   if(name!=='summary'&&!readFileSync(path,'utf8').includes('"../summary/route"'))throw new Error('Review changed dashboard endpoint before executing');
   const response=await summary.GET(new NextRequest(`http://localhost/api/dashboard/${name}?from=2026-09-26&to=2026-10-25`));
   const body=await response.json();
   result.endpoints.push({name,status:response.status,hasSummary:!!body.data?.current});
 }
 result.invalidDateStatus=(await summary.GET(new NextRequest('http://localhost/api/dashboard/summary?from=2026-02-30&to=2026-10-25'))).status;
 authenticated=false;
 result.unauthenticatedStatus=(await summary.GET(new NextRequest('http://localhost/api/dashboard/summary'))).status;
 console.log(JSON.stringify(result,null,2));
 if(result.endpoints.some(entry=>entry.status!==200)||result.invalidDateStatus!==400||result.unauthenticatedStatus!==401)process.exitCode=1;
}
main().catch(error=>{console.error(JSON.stringify({name:error.name,code:error.code,meta:error.meta}));process.exitCode=1;}).finally(()=>prisma.$disconnect());
