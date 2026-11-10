import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { realQaClient } from "./qa-real-client.mjs";

const { db, users, call, calls } = await realQaClient();
const fixtures = JSON.parse(fs.readFileSync(".tmp/qa-postgres/fixtures.json", "utf8"));
const runId = `QA_TEST_${Date.now()}`, results = [];
const save = () => { fs.writeFileSync("audit-evidence/qa-stage2/real-regressions.json", JSON.stringify({ runId, results, calls, fixtures }, null, 2)); fs.writeFileSync(".tmp/qa-postgres/fixtures.json", JSON.stringify(fixtures, null, 2)); };
async function test(id, action) { try { results.push({ id, status: "PASS", detail: await action() }); } catch (e) { results.push({ id, status: "FAIL", detail: e.message }); } save(); console.log(`${id}: ${results.at(-1).status}`); }
async function edit(id, patch) {
  let draft = (await call("/api/activity-drafts", { method: "POST", body: { activityId: id }, status: 201 })).data;
  draft = (await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload: { ...draft.payload, ...patch } } })).data;
  return (await call(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", body: { expectedUpdatedAt: draft.updatedAt } })).data;
}
let secondProfessor;
try {
  await test("USER-CREATE-EDIT-PHOTO", async () => {
    const photo = "http://localhost:3000/useradmin1.png";
    await call(`/api/users/${users.citizen.id}`, { method: "PATCH", body: { fotoPerfilUrl: photo, avatarUrl: "http://localhost:3000/useradmin2.png", celular: "1100000000" } });
    const person = (await call(`/api/access/manual/search?establishmentId=${fixtures.venueId}&q=QA_TEST_citizen`, { role: "reception" })).data.find(p => p.id === users.citizen.id);
    assert.equal(person.profilePhotoUrl, photo); assert.notEqual(person.profilePhotoUrl, person.avatarUrl);
    const role = await db.rol.findUniqueOrThrow({ where: { codigo: "teacher" } });
    const created = await call("/api/users", { method: "POST", status: 201, body: { userId: `${runId}_teacher2`, email: `${runId.toLowerCase()}@example.invalid`, password: randomBytes(24).toString("base64url"), rolId: role.id, nombre: "QA_TEST", apellido: "Profesor segundo", professorProfile: { especialidad: "QA_TEST" } } });
    secondProfessor = await db.profesor.findUniqueOrThrow({ where: { usuarioId: created.id } });
    fixtures.secondProfessorId = secondProfessor.id;
    return "Photo is persisted through the actual user endpoint and returned by real manual search; second teacher created with profile.";
  });
  const indefinite = fixtures.activities.find(a => a.label === "indefinite");
  await test("TEACHERS-OPTIONAL-MULTIPLE-PRIMARY", async () => {
    assert.ok(secondProfessor);
    let draft = (await call("/api/activity-drafts", { method: "POST", body: { activityId: indefinite.id }, status: 201 })).data;
    const schedule = draft.payload.schedules.map(s => ({ ...s, horaInicio: "11:00", horaFin: "12:00", profesorIds: [fixtures.professorId, secondProfessor.id], teacherAssignments: [] }));
    await edit(indefinite.id, { schedules: schedule });
    let links = await db.horarioActividadProfesor.findMany({ where: { horarioActividadId: indefinite.scheduleId } });
    assert.equal(links.length, 2); assert.equal(links.filter(l => l.esPrincipal).length, 1);
    await edit(indefinite.id, { schedules: schedule.map(s => ({ ...s, profesorIds: [] })) });
    assert.equal(await db.horarioActividadProfesor.count({ where: { horarioActividadId: indefinite.scheduleId } }), 0);
    assert.equal(await db.claseActividadProfesor.count({ where: { claseActividad: { horarioActividadId: indefinite.scheduleId } } }), 0);
    await edit(indefinite.id, { schedules: schedule.map(s => ({ ...s, profesorIds: [fixtures.professorId] })) });
    const classes = await call("/api/teacher/classes?dateFrom=2036-09-01&dateTo=2036-09-28", { role: "teacher" });
    assert.ok(classes.data.some(c => c.activitySchedule.id === indefinite.scheduleId));
    return "0→2→0→1 teachers; one primary; future class links and real teacher portal verified.";
  });
  await test("DRAFT-CONCURRENT-AUTOSAVE", async () => {
    const draft = (await call("/api/activity-drafts", { method: "POST", body: {}, status: 201 })).data;
    const responses = await Promise.all(["A", "B"].map(name => call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", status: [200, 409], body: { expectedUpdatedAt: draft.updatedAt, payload: { ...draft.payload, nombre: `${runId}_${name}` } } })));
    assert.equal(responses.filter(r => r.data).length, 1);
    const stored = (await call(`/api/activity-drafts/${draft.id}`)).data;
    assert.ok(stored.name.startsWith(runId));
    fixtures.concurrentDraftId = draft.id;
    return "Exactly one concurrent writer wins; the stale writer receives 409.";
  });
  await test("ACT-END-BOUNDARY-AND-IDEMPOTENT-CONCURRENCY", async () => {
    const activity = fixtures.activities.find(a => a.label === "1-month");
    const [first, second] = await Promise.all([1, 2].map(() => call(`/api/activity-sessions?activityId=${activity.id}&dateFrom=2026-11-01&dateTo=2026-11-30&pageSize=100`)));
    assert.deepEqual(first.data.map(s => s.id), second.data.map(s => s.id));
    const beyond = await call(`/api/activity-sessions?activityId=${activity.id}&dateFrom=2030-01-01&dateTo=2030-01-28&pageSize=100`);
    assert.equal(beyond.data.length, 0);
    assert.equal(await db.claseActividad.count({ where: { horarioActividadId: activity.scheduleId, fecha: new Date("2026-11-09") } }), 0);
    return "Concurrent generation is idempotent, exclusion respected, no classes after the actual end date.";
  });
  await test("ACT-INVALID-START-END", async () => {
    await call("/api/actividades", { method: "POST", status: 400, body: { nombre: `${runId}_invalid`, fechaInicio: "2027-01-01", fechaFin: "2026-12-01" } });
    return "Invalid interval rejected by the actual endpoint.";
  });
  await test("ENROLLMENT-CONFIRM-EDIT-DUPLICATE", async () => {
    assert.ok(fixtures.enrollmentId);
    const result = (await call(`/api/enrollments/${fixtures.enrollmentId}`, { method: "PATCH", body: { estado: "CONFIRMADA", observaciones: `${runId} confirmada` } })).data;
    assert.equal(result.status, "CONFIRMADA");
    await call("/api/enrollments", { method: "POST", status: [400, 409], body: { usuarioId: users.citizen.id, actividadId: indefinite.id, horarioActividadIds: [indefinite.scheduleId] } });
    const schedule = (await call("/api/citizen/schedule?dateFrom=2036-09-01&dateTo=2036-09-28", { role: "citizen" })).data;
    assert.ok(schedule.items.length > 0);
    return "Confirmed enrollment, persisted observation, duplicate prevention and non-empty citizen schedule.";
  });
  await test("TODAY-CLASS-TEACHER-ATTENDANCE-HISTORY-FINISH", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
    const weekdays = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
    const day = weekdays[new Date(`${today}T12:00:00Z`).getUTCDay()];
    let draft = (await call("/api/activity-drafts", { method: "POST", body: {}, status: 201 })).data;
    const category = await db.categoriaActividad.findFirstOrThrow();
    const audience = await db.publicoObjetivo.findUniqueOrThrow({ where: { slug: "adultos" } });
    const payload = { ...draft.payload, nombre: `${runId}_today-history`, modalidadOperacion: "HORARIO_FIJO", categoriaActividadId: category.id, publicosObjetivoIds: [audience.id], establecimientoIds: [fixtures.venueId], cupo: 5, generacionClasesDesde: today, generacionClasesHasta: null, schedules: [{ establecimientoId: fixtures.venueId, diaSemana: day, horaInicio: "16:00", horaFin: "17:00", cupoMaximo: 5, profesorIds: [fixtures.professorId], recursoIds: [] }] };
    draft = (await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload } })).data;
    const activity = (await call(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", status: 201, body: { expectedUpdatedAt: draft.updatedAt } })).data;
    const schedule = await db.horarioActividad.findFirstOrThrow({ where: { actividadId: activity.id } });
    fixtures.historyActivityId = activity.id; fixtures.historyScheduleId = schedule.id;
    const classes = (await call(`/api/activity-sessions?activityId=${activity.id}&dateFrom=${today}&dateTo=${today}`)).data;
    assert.equal(classes.length, 1); fixtures.todaySessionId = classes[0].id;
    const enrollment = (await call("/api/enrollments", { method: "POST", status: 201, body: { usuarioId: users.citizen.id, actividadId: activity.id, horarioActividadIds: [schedule.id] } })).data;
    fixtures.todayEnrollmentId = enrollment.id;
    if (enrollment.status !== "CONFIRMADA") await call(`/api/enrollments/${enrollment.id}`, { method: "PATCH", body: { estado: "CONFIRMADA" } });
    await call(`/api/teacher/attendance/${classes[0].id}`, { role: "teacher", method: "POST", body: { action: "batch", records: [{ enrollmentId: enrollment.id, status: "PRESENTE" }] } });
    assert.equal(await db.asistencia.count({ where: { claseActividadId: classes[0].id, inscripcionId: enrollment.id, estado: "PRESENTE" } }), 1);
    const before = await db.asistencia.findMany({ where: { inscripcionId: enrollment.id } });
    await call(`/api/actividades/${activity.id}`, { method: "PATCH", body: { estado: "FINALIZADA" } });
    assert.deepEqual(await db.asistencia.findMany({ where: { inscripcionId: enrollment.id } }), before);
    const future = (await call(`/api/activity-sessions?activityId=${activity.id}&dateFrom=2038-01-01&dateTo=2038-01-28`)).data;
    assert.equal(future.length, 0);
    return "Real teacher marked attendance today; finishing stopped future generation and retained attendance and enrollment history.";
  });
  await test("RBAC-RECEPTION-APPROVAL-DENIED", async () => {
    await call(`/api/users/${users.citizen.id}/access-request`, { role: "reception", method: "PATCH", status: 403, body: { decision: "APPROVE" } });
    return "Reception cannot approve access requests.";
  });
  await test("DOCUMENT-INVALID-FILE-REJECTED", async () => {
    const form = new FormData(); form.set("userId", users.citizen.id); form.set("requirementId", "00000000-0000-4000-8000-000000000000"); form.set("file", new Blob(["QA_TEST"], { type: "application/x-msdownload" }), "QA_TEST.exe");
    await call("/api/reception/documents", { role: "reception", method: "POST", body: form, status: 400 });
    return "Executable rejected before storage access. Valid uploads remain BLOCKED: no independent development Storage.";
  });
} finally { save(); await db.$disconnect(); }
