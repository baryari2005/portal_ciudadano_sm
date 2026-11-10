import fs from 'node:fs';
import assert from 'node:assert/strict';
import { realQaClient } from './qa-real-client.mjs';
const q=await realQaClient();
try{
 const context=await q.db.$queryRaw`SELECT current_database() AS database,inet_server_addr()::text AS host,inet_server_port() AS port`;
 assert.equal(context[0].database,'mas_sanmiguel_qa');assert.equal(context[0].port,55432);
 const platform=JSON.parse(fs.readFileSync('audit-evidence/auth-persistence/platform-regression.json'));
 const fixture=JSON.parse(fs.readFileSync('.tmp/qa-postgres/auth-platform-fixtures.json'));
 const ids=fixture.activities.map(a=>a.id);
 const scheduleIds=fixture.activities.map(a=>a.scheduleId);
 const duplicates=await q.db.$queryRaw`SELECT "horarioActividadId",fecha,"horaInicio","horaFin",count(*)::text AS count FROM "ClaseActividad" WHERE "horarioActividadId"=ANY(${scheduleIds}::text[]) GROUP BY "horarioActividadId",fecha,"horaInicio","horaFin" HAVING count(*)>1`;
 assert.equal(duplicates.length,0);
 const counts=await q.db.$queryRaw`SELECT (SELECT count(*)::text FROM "Usuario" WHERE "userId" LIKE 'QA_TEST%') AS fictitious_users,(SELECT count(*)::text FROM "Inscripcion") AS enrollments,(SELECT count(*)::text FROM "ReservaClase") AS reservations,(SELECT count(*)::text FROM "Asistencia") AS attendance`;
 fs.writeFileSync('audit-evidence/auth-persistence/sql-local.json',JSON.stringify({context,realPostgreSql:true,queries:['SELECT current_database(),inet_server_addr(),inet_server_port()','SELECT horarioActividadId,fecha,horaInicio,horaFin,count(*) FROM ClaseActividad WHERE horarioActividadId=ANY($1) GROUP BY horarioActividadId,fecha,horaInicio,horaFin HAVING count(*)>1'],newActivityIds:ids,newScheduleIds:scheduleIds,duplicateClasses:duplicates,counts,platformRun:platform.runId},null,2));
 console.log(JSON.stringify({localContext:context,duplicateClasses:duplicates.length,counts}));
}finally{await q.db.$disconnect();}
