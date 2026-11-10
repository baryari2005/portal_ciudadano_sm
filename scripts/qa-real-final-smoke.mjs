import fs from "node:fs";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { realQaClient } from "./qa-real-client.mjs";
const { db, call, calls } = await realQaClient();
const fixtures = JSON.parse(fs.readFileSync(".tmp/qa-postgres/fixtures.json", "utf8"));
const results = [];
try {
  for (const [role, route] of [
    ["admin", "/api/actividades"], ["admin", "/api/dashboard/summary"], ["admin", "/api/roles"],
    ["teacher", "/api/teacher/summary"], ["teacher", "/api/teacher/classes?dateFrom=2036-09-01&dateTo=2036-09-28"],
    ["reception", `/api/access?view=home&establishmentId=${fixtures.venueId}`],
    ["reception", `/api/access/manual/search?establishmentId=${fixtures.venueId}&q=QA_TEST_citizen`],
    ["citizen", "/api/citizen/summary"], ["citizen", "/api/citizen/schedule?dateFrom=2036-09-01&dateTo=2036-09-28"],
  ]) { await call(route, { role }); results.push({ id: `FINAL-${role}-${route}`, status: "PASS" }); }
  for (const activity of fixtures.activities) {
    const live = (await call(`/api/actividades/${activity.id}`)).data;
    assert.equal(live.fechaInicio.slice(0, 10), "2026-11-01");
    assert.equal(live.fechaFin?.slice(0, 10) ?? null, activity.endDate);
    const route = `/api/activity-sessions?activityId=${activity.id}&dateFrom=${activity.month}-01&dateTo=${activity.month}-28&pageSize=100`;
    const a = (await call(route)).data, b = (await call(route)).data;
    assert.ok(a.length); assert.deepEqual(a.map(item => item.id), b.map(item => item.id));
    results.push({ id: `FINAL-VALIDITY-${activity.label}`, status: "PASS", sessions: a.length });
  }
  for (const [modelName, fields] of [["Actividad", ["fechaInicio", "fechaFin", "fechasExcluidas"]], ["HorarioActividad", ["distribucionDocente"]]]) {
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName);
    assert.ok(!model.fields.some(field => fields.includes(field.name)));
    const columns = await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=${model.dbName ?? model.name}`;
    assert.ok(!columns.some(row => fields.includes(row.column_name)));
  }
  results.push({ id: "FINAL-ORIGINAL-SCHEMA-NO-NEW-COLUMNS", status: "PASS" });
} catch (error) { results.push({ id: "FINAL-SMOKE", status: "FAIL", detail: error.message }); }
finally { fs.writeFileSync(`${process.env.QA_EVIDENCE_DIR ?? "audit-evidence/qa-stage2"}/final-smoke.json`, JSON.stringify({ actualCompiledApplication: true, results, calls }, null, 2)); await db.$disconnect(); }
console.log(JSON.stringify({ passed: results.filter(r => r.status === "PASS").length, failed: results.filter(r => r.status === "FAIL") }));
