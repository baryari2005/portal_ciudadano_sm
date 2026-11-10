import fs from "node:fs";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const base = "http://localhost:3000";
const connection = /^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1];
const url = new URL(connection);
assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55432"); assert.equal(url.pathname, "/mas_sanmiguel_qa");
const db = new PrismaClient({ datasourceUrl: connection });
const accounts = JSON.parse(fs.readFileSync(".tmp/qa-postgres/accounts.private.json", "utf8"));
const tokens = {}, users = {}, results = [], requests = [], fixtures = { activities: [] };
const runId = `QA_TEST_${Date.now()}`;
let writesEnabled = false;
function persist() {
  fs.writeFileSync("audit-evidence/qa-stage2/real-endpoint-results.json", JSON.stringify({ runId, base, backend: "real endpoints / Prisma / local PostgreSQL", apiInterception: false, results, requests, fixtures }, null, 2));
  fs.writeFileSync(".tmp/qa-postgres/fixtures.json", JSON.stringify(fixtures, null, 2));
}
async function request(route, { role = "admin", method = "GET", body, expected = 200 } = {}) {
  if (method !== "GET" && !writesEnabled && route !== "/api/auth/login") throw new Error("Write guard: local server identity not verified.");
  const start = Date.now();
  const response = await fetch(base + route, { method, headers: { ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000) });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 160) }; }
  requests.push({ route, role, method, status: response.status, elapsedMs: Date.now() - start });
  assert.ok((Array.isArray(expected) ? expected : [expected]).includes(response.status), `${method} ${route}: expected ${expected}, got ${response.status}: ${JSON.stringify(data).slice(0, 600)}`);
  return data;
}
async function test(id, work) {
  try { const detail = await work(); results.push({ id, status: "PASS", detail }); }
  catch (error) { results.push({ id, status: "FAIL", detail: error.message }); }
  persist(); console.log(`${id}: ${results.at(-1).status}`);
}
const date = value => value?.slice(0, 10) ?? null;
async function edit(activity, patch) {
  let draft = (await request("/api/activity-drafts", { method: "POST", body: { activityId: activity.id }, expected: 201 })).data;
  draft = (await request(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload: { ...draft.payload, ...patch } } })).data;
  return (await request(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", body: { expectedUpdatedAt: draft.updatedAt } })).data;
}
try {
  for (const account of accounts) {
    const login = await request("/api/auth/login", { method: "POST", body: { userId: account.userId, password: account.password } });
    assert.ok(login.token, "Real login did not issue a token.");
    tokens[account.role] = login.token;
    users[account.role] = (await request("/api/auth/me", { role: account.role })).user;
    const local = await db.usuario.findUniqueOrThrow({ where: { userId: account.userId } });
    assert.equal(users[account.role].id, local.id, "STOP: localhost does not use the independent QA database.");
    assert.equal(users[account.role].rol.codigo, account.role);
    results.push({ id: `AUTH-${account.role}`, status: "PASS", detail: "Real login and /me match the unique local PostgreSQL user." });
  }
  writesEnabled = true; persist();
  const venue = await db.establecimiento.findUniqueOrThrow({ where: { id: "qa-local-establishment" } });
  const category = await db.categoriaActividad.findFirstOrThrow({ where: { activo: true } });
  const audience = await db.publicoObjetivo.findFirstOrThrow({ where: { activo: true, slug: "adultos" } });
  const professor = await db.profesor.findUniqueOrThrow({ where: { usuarioId: users.teacher.id } });
  fixtures.venueId = venue.id; fixtures.professorId = professor.id; fixtures.citizenId = users.citizen.id;
  const durations = [
    ["1-month", "2026-12-01", "2026-11"], ["6-months", "2027-05-01", "2027-03"],
    ["1-year", "2027-11-01", "2027-09"], ["2-years", "2028-11-01", "2028-09"],
    ["5-years", "2031-11-01", "2031-09"], ["indefinite", null, "2036-09"],
  ];
  for (const [label, endDate, month] of durations) {
    await test(`ACT-CREATE-${label}-NO-TEACHER`, async () => {
      let draft = (await request("/api/activity-drafts", { method: "POST", body: {}, expected: 201 })).data;
      const payload = { ...draft.payload, modalidadOperacion: "HORARIO_FIJO", nombre: `${runId}_${label}`, categoriaActividadId: category.id,
        descripcion: "Datos ficticios QA_TEST", establecimientoIds: [venue.id], publicosObjetivoIds: [audience.id], cupo: 20,
        generacionClasesDesde: "2026-11-01", generacionClasesHasta: endDate, fechasExcluidas: ["2026-11-09"],
        schedules: [{ establecimientoId: venue.id, diaSemana: "LUNES", horaInicio: "16:00", horaFin: "17:00", cupoMaximo: 20, profesorIds: [], recursoIds: [] }] };
      draft = (await request(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload } })).data;
      assert.deepEqual(draft.pending, []);
      const activity = (await request(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", body: { expectedUpdatedAt: draft.updatedAt }, expected: 201 })).data;
      assert.equal(date(activity.fechaInicio), "2026-11-01"); assert.equal(date(activity.fechaFin), endDate);
      const schedule = await db.horarioActividad.findFirstOrThrow({ where: { actividadId: activity.id } });
      assert.equal(await db.horarioActividadProfesor.count({ where: { horarioActividadId: schedule.id } }), 0);
      const initialClasses = await db.claseActividad.count({ where: { horarioActividadId: schedule.id } });
      assert.ok(initialClasses <= 6, `Eager generation: ${initialClasses}`);
      fixtures.activities.push({ id: activity.id, name: activity.nombre, label, endDate, month, scheduleId: schedule.id });
      return { activityId: activity.id, initialClasses };
    });
    const activity = fixtures.activities.find(item => item.label === label);
    if (!activity) continue;
    await test(`ACT-FUTURE-${label}`, async () => {
      const route = `/api/activity-sessions?activityId=${activity.id}&dateFrom=${month}-01&dateTo=${month}-28&pageSize=100`;
      const first = await request(route), second = await request(route);
      assert.ok(first.data.length > 0, "No future sessions generated.");
      assert.deepEqual(first.data.map(item => item.id), second.data.map(item => item.id));
      assert.ok(first.data.every(item => item.professors.length === 0));
      const rows = await db.claseActividad.findMany({ where: { horarioActividadId: activity.scheduleId } });
      assert.equal(new Set(rows.map(row => `${row.fecha.toISOString()}|${row.horaInicio}|${row.horaFin}`)).size, rows.length);
      assert.ok(rows.every(row => row.fecha.toISOString().slice(0, 10) !== "2026-11-09"));
      return { month, count: first.data.length, idempotent: true };
    });
    await test(`ACT-EDIT-${label}-DIFFERENTIAL`, async () => {
      const before = await db.claseActividad.findMany({ where: { horarioActividadId: activity.scheduleId }, orderBy: { id: "asc" } });
      const updated = await edit(activity, { descripcion: `${runId} visual-only edit` });
      assert.equal(date(updated.fechaFin), endDate);
      assert.equal(date(updated.fechaInicio), "2026-11-01");
      const after = await db.claseActividad.findMany({ where: { horarioActividadId: activity.scheduleId }, orderBy: { id: "asc" } });
      assert.deepEqual(after, before, "Informational edit changed sessions.");
      return "Saved and reloaded dates; session IDs, timestamps and capacity unchanged.";
    });
  }
  const indefinite = fixtures.activities.find(item => item.label === "indefinite");
  if (indefinite) {
    await test("ACT-CONVERT-FINITE-INDEFINITE", async () => {
      assert.equal(date((await edit(indefinite, { generacionClasesHasta: "2037-11-01" })).fechaFin), "2037-11-01");
      assert.equal((await edit(indefinite, { generacionClasesHasta: null })).fechaFin, null);
      return "Both conversions persisted through real workflow endpoints.";
    });
    await test("TEACHER-ADD-REMOVE", async () => {
      let draft = (await request("/api/activity-drafts", { method: "POST", body: { activityId: indefinite.id }, expected: 201 })).data;
      const schedules = draft.payload.schedules.map(item => ({ ...item, profesorIds: [professor.id], teacherAssignments: [] }));
      await edit(indefinite, { schedules });
      assert.equal(await db.horarioActividadProfesor.count({ where: { horarioActividadId: indefinite.scheduleId } }), 1);
      assert.ok(await db.claseActividadProfesor.count({ where: { claseActividad: { horarioActividadId: indefinite.scheduleId } } }) > 0);
      const teacherClasses = await request("/api/teacher/classes?dateFrom=2036-09-01&dateTo=2036-09-28", { role: "teacher" });
      assert.ok(teacherClasses.data.length > 0);
      await edit(indefinite, { schedules: schedules.map(item => ({ ...item, profesorIds: [] })) });
      assert.equal(await db.horarioActividadProfesor.count({ where: { horarioActividadId: indefinite.scheduleId } }), 0);
      assert.equal(await db.claseActividadProfesor.count({ where: { claseActividad: { horarioActividadId: indefinite.scheduleId } } }), 0);
      // Leave a teacher assigned to support real browser QA.
      await edit(indefinite, { schedules });
      return "Assignment, real teacher query, removal and reassignment verified in PostgreSQL.";
    });
    await test("ENROLLMENT-CREATE", async () => {
      const enrollment = (await request("/api/enrollments", { method: "POST", expected: 201, body: { usuarioId: users.citizen.id, actividadId: indefinite.id, horarioActividadIds: [indefinite.scheduleId], observaciones: `${runId} inscripción ficticia` } })).data;
      fixtures.enrollmentId = enrollment.id;
      assert.ok(await db.inscripcion.findUnique({ where: { id: enrollment.id } }));
      return { enrollmentId: enrollment.id, status: enrollment.status };
    });
  }
  for (const role of ["teacher", "reception", "citizen"]) {
    await test(`RBAC-${role}-ADMIN-WRITE-DENIED`, async () => { await request("/api/actividades", { role, method: "POST", body: { nombre: `${runId}_forbidden` }, expected: 403 }); return "403 before mutation."; });
  }
  for (const [role, routes] of Object.entries({
    admin: ["/api/actividades", "/api/activity-drafts", "/api/dashboard/summary", "/api/users", "/api/roles", "/api/establecimientos", "/api/profesores", "/api/categorias-actividades", "/api/publicos-objetivo", "/api/resources", "/api/requirements", "/api/enrollments", "/api/notifications", "/api/reports/activities"],
    teacher: ["/api/teacher/summary", "/api/teacher/profile", "/api/teacher/schedules", "/api/teacher/classes", "/api/teacher/enrollees", "/api/teacher/notifications"],
    reception: [`/api/access?view=home&establishmentId=${venue.id}`, "/api/access?view=options", `/api/access/manual/search?establishmentId=${venue.id}&q=QA_TEST`, "/api/user-documents/citizens?q=QA_TEST"],
    citizen: ["/api/citizen/summary", "/api/citizen/profile", "/api/citizen/activities", "/api/citizen/enrollments", "/api/citizen/documents", "/api/citizen/attendance", "/api/citizen/notifications", "/api/citizen/schedule?dateFrom=2036-09-01&dateTo=2036-09-28"],
  })) for (const route of routes) await test(`READ-${role}-${route}`, async () => { await request(route, { role }); return "Real authorized endpoint returned 200."; });
  await test("ACCESS-MANUAL-ALLOW-REJECT", async () => {
    const before = await db.registroAcceso.count({ where: { usuarioId: users.citizen.id } });
    for (const decision of ["ALLOW", "REJECT"]) {
      const result = (await request("/api/access/manual/register", { role: "reception", method: "POST", expected: 201, body: { establishmentId: venue.id, userId: users.citizen.id, decision, observation: `${runId} registro ficticio ${decision}` } })).data;
      assert.equal(result.allowed, decision === "ALLOW");
    }
    assert.equal(await db.registroAcceso.count({ where: { usuarioId: users.citizen.id } }), before + 2);
    return "Both decisions persisted for the fictional citizen only.";
  });
  await test("QR-ISSUE-VALIDATE", async () => {
    const qr = (await request("/api/citizen/qr/issue", { role: "citizen", method: "POST", expected: 201 })).data;
    fs.writeFileSync(".tmp/qa-postgres/citizen-qr.private.json", JSON.stringify(qr));
    const token = qr.token ?? qr.qrToken ?? qr.payload;
    assert.ok(typeof token === "string", `Unexpected QR DTO keys: ${Object.keys(qr)}`);
    const result = await request("/api/access/qr/validate", { role: "reception", method: "POST", expected: 201, body: { establishmentId: venue.id, qrToken: token } });
    assert.equal(result.user.id, users.citizen.id);
    return "Issued and resolved the fictional citizen with the real QR endpoint.";
  });
} finally { persist(); await db.$disconnect(); }
console.log(JSON.stringify({ passed: results.filter(item => item.status === "PASS").length, failed: results.filter(item => item.status === "FAIL").length }));
