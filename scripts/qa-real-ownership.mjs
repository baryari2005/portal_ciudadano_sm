import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { realQaClient } from "./qa-real-client.mjs";
const { db, call, calls, users } = await realQaClient();
const fixtures = JSON.parse(fs.readFileSync(".tmp/qa-postgres/fixtures.json", "utf8"));
const before = process.argv.includes("--before");
const file = `audit-evidence/qa-stage2/ownership-${before ? "before" : "after"}.json`;
const results = [];
async function test(id, work) { try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { results.push({ id, status: "FAIL", detail: e.message }); } fs.writeFileSync(file, JSON.stringify({ results, calls }, null, 2)); console.log(`${id}: ${results.at(-1).status}`); }
try {
  const activity = fixtures.activities.find(a => a.label === "1-month");
  if (!fixtures.otherEnrollmentId) {
    const role = await db.rol.findUniqueOrThrow({ where: { codigo: "citizen" } });
    const name = `QA_TEST_other_citizen_${Date.now()}`;
    const person = await call("/api/users", { method: "POST", status: 201, body: { userId: name, email: `${name.toLowerCase()}@example.invalid`, password: randomBytes(24).toString("base64url"), rolId: role.id, nombre: "QA_TEST", apellido: "Ciudadano ajeno", fechaNacimiento: "1990-01-01" } });
    const enrollment = (await call("/api/enrollments", { method: "POST", status: 201, body: { usuarioId: person.id, actividadId: activity.id, horarioActividadIds: [activity.scheduleId] } })).data;
    fixtures.otherEnrollmentId = enrollment.id;
    fs.writeFileSync(".tmp/qa-postgres/fixtures.json", JSON.stringify(fixtures, null, 2));
  }
  await test("CITIZEN-CANNOT-CANCEL-ANOTHER-ENROLLMENT", async () => {
    const old = await db.inscripcion.findUniqueOrThrow({ where: { id: fixtures.otherEnrollmentId } });
    await call(`/api/citizen/enrollments/${old.id}`, { role: "citizen", method: "DELETE", body: { reason: "QA_TEST unauthorized cancellation" }, status: [403, 404] });
    assert.deepEqual(await db.inscripcion.findUnique({ where: { id: old.id } }), old);
    return "Ownership enforced and other citizen's enrollment unchanged.";
  });
  const session = await db.claseActividad.findFirstOrThrow({ where: { horarioActividadId: activity.scheduleId } });
  await test("TEACHER-FOREIGN-CLASS-DETAIL-DENIED", async () => { await call(`/api/activity-sessions/${session.id}`, { role: "teacher", status: 403 }); return "Foreign class detail returns 403."; });
  await test("TEACHER-FOREIGN-CLASS-LIST-SCOPED", async () => { const data = (await call(`/api/activity-sessions?activityId=${activity.id}&dateFrom=2026-11-01&dateTo=2026-11-30`, { role: "teacher" })).data; assert.equal(data.length, 0, "Generic class list disclosed unassigned classes."); return "Unassigned classes are absent from the generic list."; });
  await test("TEACHER-FOREIGN-ENROLLMENT-LIST-SCOPED", async () => { const data = (await call(`/api/enrollments?activityId=${activity.id}`, { role: "teacher" })).data; assert.equal(data.length, 0, "Generic enrollment list disclosed an unrelated citizen."); return "Other citizens' enrollments are absent."; });
  await test("TEACHER-FOREIGN-ENROLLMENT-DETAIL-DENIED", async () => { await call(`/api/enrollments/${fixtures.otherEnrollmentId}`, { role: "teacher", status: 403 }); return "Foreign enrollment detail returns 403."; });
  await test("CITIZEN-ADMIN-ROLES-DENIED", async () => { await call("/api/roles", { role: "citizen", status: 403 }); return "Roles catalog returns 403."; });
  await test("TEACHER-OWN-CLASSES-STILL-AVAILABLE", async () => { const data = (await call("/api/teacher/classes?dateFrom=2036-09-01&dateTo=2036-09-28", { role: "teacher" })).data; assert.ok(data.length > 0); return "Assigned future classes remain accessible."; });
} finally { await db.$disconnect(); }
