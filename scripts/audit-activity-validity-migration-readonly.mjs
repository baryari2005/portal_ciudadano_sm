import { PrismaClient, Prisma } from '@prisma/client';
import { readFileSync, readdirSync } from 'node:fs';

const migration = '20261025000000_activity_validity';
const fields = { Actividad: ['fechaInicio','fechaFin','fechasExcluidas'], HorarioActividad: ['distribucionDocente'] };
const schemaDependencies = Object.entries(fields).flatMap(([name, names]) => {
 const model=Prisma.dmmf.datamodel.models.find(model=>model.name===name);
 return (model?.fields??[]).filter(field=>names.includes(field.name)).map(field=>`${name}.${field.name}`);
});
const target=(value)=>{
 const url=new URL(value);
 const project=url.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? decodeURIComponent(url.username).split('.')[1];
 return {url,project};
};
const connections=['DATABASE_URL','DIRECT_URL'].filter(key=>process.env[key]);
const configured=connections.map(key=>({key,...target(process.env[key])}));
const publicProject=process.env.NEXT_PUBLIC_SUPABASE_URL?new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]:null;
const results=[];
for(const {key,url,project} of configured){
 const db=new PrismaClient({datasourceUrl:url.toString(),log:[]});
 try{
  const result=await db.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
   const mode=await tx.$queryRawUnsafe('SHOW transaction_read_only');
   const history=await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations"');
   const columns=await tx.$queryRawUnsafe(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND ((table_name='Actividad' AND column_name IN ('fechaInicio','fechaFin','fechasExcluidas')) OR (table_name='ActividadHorario' AND column_name='distribucionDocente'))`);
   const local=readdirSync('prisma/migrations',{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>item.name);
   return {connection:key,readOnly:mode[0].transaction_read_only,historyRowsForTarget:history.filter(row=>row.migration_name===migration).map(row=>({migration:row.migration_name,finished:!!row.finished_at,rolledBack:!!row.rolled_back_at})),newColumnsPresent:columns,pendingLocalMigrations:local.filter(name=>!history.some(row=>row.migration_name===name&&row.finished_at&&!row.rolled_back_at)),unfinishedMigrations:history.filter(row=>!row.finished_at&&!row.rolled_back_at).map(row=>row.migration_name),appliedNotInLocal:history.filter(row=>row.finished_at&&!row.rolled_back_at&&!local.includes(row.migration_name)).map(row=>row.migration_name),appliedNotInLocalDetails:history.filter(row=>row.finished_at&&!row.rolled_back_at&&!local.includes(row.migration_name)).map(row=>({migration:row.migration_name,checksum:row.checksum})),matchesPublicSupabaseProject:!!project&&project===publicProject};
  },{timeout:60000});
  results.push(result);
 }catch(error){results.push({connection:key,error:{name:error.name,code:error.code}});}
 finally{await db.$disconnect();}
}
const sameConfiguredProject=!!configured.length&&!!configured[0].project&&configured.every(item=>item.project===configured[0].project);
const generatedSchemaMatches=readFileSync('prisma/schema.prisma','utf8').replace(/\s+/g,'')===readFileSync('node_modules/.prisma/client/schema.prisma','utf8').replace(/\s+/g,'');
const safeToArchive=connections.length===2&&sameConfiguredProject&&schemaDependencies.length===0&&generatedSchemaMatches&&results.every(row=>!row.error&&row.readOnly==='on'&&row.historyRowsForTarget.length===0&&row.newColumnsPresent.length===0&&row.unfinishedMigrations.length===0&&row.matchesPublicSupabaseProject);
const historyConsistent=results.every(row=>!row.error&&row.appliedNotInLocal.length===0&&row.unfinishedMigrations.length===0);
console.log(JSON.stringify({migration,connectionsChecked:connections,sameConfiguredProject,schemaDependencies,generatedSchemaMatches,results,safeToArchive,historyConsistent},null,2));
if(!safeToArchive)process.exitCode=1;
