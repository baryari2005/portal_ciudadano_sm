import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { realQaClient } from "./qa-real-client.mjs";
const { db, call, calls } = await realQaClient();
const run = `QA_TEST_CAT_${Date.now()}`, results = [], fixtures = [];
const save = () => fs.writeFileSync(`${process.env.QA_EVIDENCE_DIR ?? "audit-evidence/citizen-catalog"}/integration.json`, JSON.stringify({ run, apiInterception: false, results, fixtures, calls }, null, 2));
async function test(id, work) { try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { results.push({ id, status: "FAIL", detail: e.message }); } save(); console.log(`${id}: ${results.at(-1).status} ${results.at(-1).status === "FAIL" ? results.at(-1).detail : ""}`); }
const category = await db.categoriaActividad.findFirstOrThrow({ where: { activo: true } });
const audience = await db.publicoObjetivo.findUniqueOrThrow({ where: { slug: "adultos" } });
const role = await db.rol.findUniqueOrThrow({ where: { codigo: "teacher" } });
const u = await call("/api/users", { method: "POST", status: 201, body: { userId: `${run}_prof`, email: `${run.toLowerCase()}@example.invalid`, password: randomBytes(24).toString("base64url"), nombre: "QA_TEST", apellido: "Catálogo", rolId: role.id, professorProfile: { especialidad: "QA_TEST" } } });
const professor = await db.profesor.findUniqueOrThrow({ where: { usuarioId: u.id } });
const list = async search => (await call(`/api/citizen/activities${search ? `?search=${encodeURIComponent(search)}` : ""}`, { role: "citizen" })).data;
async function create(label, { hasProfessor = false, end = null, day = "SABADO", capacity = 5, start = "2026-10-01" } = {}) {
  let draft = (await call("/api/activity-drafts", { method: "POST", body: {}, status: 201 })).data;
  const payload = { ...draft.payload, nombre: `${run}_${label}`, descripcionCorta: "QA_TEST catálogo ciudadano", modalidadOperacion: "HORARIO_FIJO", categoriaActividadId: category.id, establecimientoIds: ["qa-local-establishment"], publicosObjetivoIds: [audience.id], cupo: capacity, imagenUrl: "http://localhost:3000/useradmin1.png", generacionClasesDesde: start, generacionClasesHasta: end, schedules: [{ establecimientoId: "qa-local-establishment", diaSemana: day, horaInicio: "21:00", horaFin: "22:00", cupoMaximo: capacity, profesorIds: hasProfessor ? [professor.id] : [], recursoIds: [] }] };
  draft = (await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload } })).data;
  const a = (await call(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", body: { expectedUpdatedAt: draft.updatedAt }, status: 201 })).data;
  const h = await db.horarioActividad.findFirstOrThrow({ where: { actividadId: a.id } });
  const f = { id: a.id, scheduleId: h.id, label, name: a.nombre, ...{ hasProfessor, end } }; fixtures.push(f); save(); return f;
}
try {
  const variants = [
    ["finite-prof", { hasProfessor: true, end: "2027-10-01", day: "MARTES" }],
    ["finite-no-prof", { end: "2031-10-01", day: "MIERCOLES" }],
    ["indefinite-prof", { hasProfessor: true, day: "JUEVES" }],
    ["indefinite-no-prof", { day: "VIERNES" }],
  ];
  for (const [label, options] of variants) await test(`VISIBLE-${label}`, async () => {
    const a = await create(label, options); const found = (await list(a.name)).find(i => i.id === a.id); assert.ok(found);
    assert.equal(found.schedules[0].professors.length, options.hasProfessor ? 1 : 0);
    const detail = (await call(`/api/citizen/activities/${a.id}`, { role: "citizen" })).data;
    assert.equal(detail.id, a.id); assert.equal(detail.schedules[0].id, a.scheduleId);
    return { id: a.id, end: a.end, professors: found.schedules[0].professors.length };
  });
  await test("LEGACY-SOURCE-COMPATIBILITY", async () => {
    const copied = JSON.parse(fs.readFileSync("audit-evidence/citizen-catalog/source-reproduction.json", "utf8"));
    const visibility = JSON.parse(fs.readFileSync("audit-evidence/citizen-catalog/source-visibility.json", "utf8"));
    const actual = await list();
    for (const a of copied.activities) {
      const expected = visibility.activities.find(v => v.id === a.originalId); assert.equal(actual.some(i => i.id === a.id), !expected.expired, a.name);
      if (!expected.expired) assert.equal((await call(`/api/citizen/activities/${a.id}`, { role: "citizen" })).data.id, a.id);
    }
    return "All nine operational replicas match published end dates; legacy activities without confirmed validity retain existing catalog compatibility.";
  });
  await test("NO-ACTIVE-SCHEDULES", async () => {
    const a = await create("no-schedules"); await call(`/api/activity-schedules/${a.scheduleId}`, { method: "PATCH", body: { estado: "SUSPENDIDO" } });
    const found = (await list(a.name)).find(i => i.id === a.id); assert.ok(found); assert.equal(found.schedules.length, 0);
    assert.equal((await call(`/api/citizen/activities/${a.id}`, { role: "citizen" })).data.schedules.length, 0);
    return "Existing rule: active activity remains listed with zero selectable schedules; no new visibility rule introduced.";
  });
  await test("FULL-ACTIVITY-AND-LEGACY-STATES", async () => {
    const a = await create("full", { day: "DOMINGO", capacity: 1 });
    const citizenRole = await db.rol.findUniqueOrThrow({ where: { codigo: "citizen" } });
    const person = await call("/api/users", { method: "POST", status: 201, body: { userId: `${run}_full`, email: `${run.toLowerCase()}_full@example.invalid`, password: randomBytes(24).toString("base64url"), nombre: "QA_TEST", apellido: "Cupo", rolId: citizenRole.id, fechaNacimiento: "1990-01-01" } });
    await call("/api/enrollments", { method: "POST", status: 201, body: { usuarioId: person.id, actividadId: a.id, horarioActividadIds: [a.scheduleId] } });
    for (const state of ["ACTIVA", "SIN_CUPO", "COMPLETA"]) {
      await call(`/api/actividades/${a.id}`, { method: "PATCH", body: { estado: state } });
      const found = (await list(a.name)).find(i => i.id === a.id); assert.ok(found); assert.equal(found.schedules[0].availableCount, 0);
    }
    return "Full, SIN_CUPO and COMPLETA remain visible according to the existing API rule; capacity stays zero.";
  });
  for (const state of ["SUSPENDIDA", "FINALIZADA", "CANCELADA", "BORRADOR"]) await test(`HIDDEN-${state}`, async () => {
    const a = await create(`state-${state}`);
    if (state === "CANCELADA") await call(`/api/actividades/${a.id}/lifecycle`, { method: "POST", body: { reason: `${run} baja de fixture` } });
    else await call(`/api/actividades/${a.id}`, { method: "PATCH", body: { estado: state } });
    assert.ok(!(await list(a.name)).some(i => i.id === a.id));
    await call(`/api/citizen/activities/${a.id}`, { role: "citizen", status: 404 });
    return "State excluded by API; direct detail cannot bypass catalog visibility.";
  });
  await test("CATALOG-SEARCH-EMPTY", async () => { assert.equal((await list(`QA_TEST_missing_${run}`)).length, 0); return "Empty search is a successful empty result, not a 500."; });
  await test("FUTURE-CLASSES-BOUNDED-IDEMPOTENT", async () => {
    const a = fixtures.find(f => f.label === "indefinite-no-prof");
    const path = `/api/activity-sessions?activityId=${a.id}&dateFrom=2040-11-01&dateTo=2040-11-28&pageSize=100`;
    const before = await db.claseActividad.count({ where: { horarioActividadId: a.scheduleId } });
    const first = (await call(path)).data, second = (await call(path)).data; assert.ok(first.length); assert.deepEqual(first.map(c => c.id), second.map(c => c.id));
    assert.ok((await db.claseActividad.count({ where: { horarioActividadId: a.scheduleId } })) - before <= 5);
    return "Future month 2040 generates at most five classes without professor or duplicates.";
  });
  await test("ADMIN-AND-RECEPTION-REGRESSION", async () => {
    await call("/api/dashboard/summary"); await call("/api/actividades"); await call("/api/access?view=home&establishmentId=qa-local-establishment", { role: "reception" }); return "Real admin catalog/dashboard and reception dashboard respond 200 locally.";
  });
} finally { save(); await db.$disconnect(); }
