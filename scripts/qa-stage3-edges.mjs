import fs from "node:fs";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";
const { db, call, calls, authenticate } = await realQaClient();
const source = process.argv[2] ?? fs.readdirSync("audit-evidence/qa-stage3").filter(f => f.startsWith("functional-")).sort().at(-1);
const original = JSON.parse(fs.readFileSync(`audit-evidence/qa-stage3/${source}`, "utf8"));
const { run, fixtures } = original;
const { password } = JSON.parse(fs.readFileSync(`.tmp/qa-postgres/stage3-${run}.private.json`, "utf8"));
const results = [], created = [];
const file = `audit-evidence/qa-stage3/edges-${Date.now()}.json`;
const venueId = "qa-local-establishment";
const people = fixtures.users.filter(u => /^c\d$/.test(u.label));
const a = fixtures.activities.find(a => a.label === "reservation");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const save = () => fs.writeFileSync(file, JSON.stringify({ run, results, calls, created, apiInterception: false }, null, 2));
async function test(id, fn) { if (process.env.QA_EDGE_CASES && !new RegExp(process.env.QA_EDGE_CASES).test(id)) return; try { results.push({ id, status: "PASS", detail: await fn() }); } catch (e) { results.push({ id, status: "FAIL", detail: e.message }); } save(); console.log(`${id}: ${results.at(-1).status} ${results.at(-1).status === "FAIL" ? results.at(-1).detail : ""}`); }
const user = label => people.find(u => u.label === label);
const addClass = async (date, startTime, endTime, extra = {}) => {
  const r = (await call("/api/activity-sessions", { method: "POST", status: 201, body: { activityScheduleId: a.scheduleId, date, startTime, endTime, professorIds: [], observations: `${run} extra class`, ...extra } })).data;
  created.push({ type: "class", id: r.id }); save(); return r;
};
const validate = qrToken => call("/api/access/qr/validate", { role: "reception", method: "POST", status: 201, body: { establishmentId: venueId, qrToken } });
try {
  for (const u of people) await authenticate(u.label, u.userId, password);
  await test("RESERVATION-DUPLICATE-CANCEL-OFFER-CONFIRM", async () => {
    const s = await addClass("2026-11-03", "18:00", "19:00");
    for (const role of ["c0", "c1", "c3"]) await call(`/api/citizen/classes/${s.id}/reserve`, { role, method: "POST", status: 201 });
    await call(`/api/citizen/classes/${s.id}/reserve`, { role: "c0", method: "POST", status: 409 });
    await call(`/api/citizen/classes/${s.id}/cancel`, { role: "c0", method: "POST", body: { reason: `${run} timely cancellation` } });
    const cancelled = await db.reservaClase.findFirstOrThrow({ where: { claseActividadId: s.id, usuarioId: user("c0").id } }); assert.equal(cancelled.estado, "AUSENCIA_INFORMADA"); assert.equal(cancelled.cancelacionJustificada, true);
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: s.id, estado: "OFRECIDA" } }), 2);
    const responses = await Promise.all(["c1", "c3"].map(role => call(`/api/citizen/classes/${s.id}/confirm`, { role, method: "POST", status: [200, 400, 409] })));
    assert.equal(responses.filter(r => r.data).length, 1);
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: s.id, estado: "RESERVADA" } }), 1);
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: s.id, estado: "LISTA_ESPERA" } }), 1);
    await call(`/api/citizen/classes/${s.id}/reserve`, { role: "c0", method: "POST", status: 201 });
    assert.equal((await db.reservaClase.findUniqueOrThrow({ where: { id: cancelled.id } })).estado, "LISTA_ESPERA");
    return "Fresh class: duplicate prevented, timely absence saved, two waiters offered, parallel confirmations select one winner, rebooking obeys capacity.";
  });
  await test("RESERVATION-CONFLICT-AND-SESSION-STATE", async () => {
    const s = await addClass("2026-11-03", "18:15", "18:45");
    await call(`/api/citizen/classes/${s.id}/reserve`, { role: "c1", method: "POST", status: 409 });
    await call(`/api/activity-sessions/${s.id}`, { method: "PATCH", body: { status: "FINALIZADA" } });
    await call(`/api/citizen/classes/${s.id}/reserve`, { role: "c3", method: "POST", status: 400 });
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: s.id } }), 0);
    return "Exact-date overlapping reservation blocked; finalized class rejects reservation without rows.";
  });
  let currentClass, currentQr;
  await test("QR-REAL-CURRENT-CLASS-ALLOWED", async () => {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":").map(Number);
    const hour = parts[0], start = `${String(hour).padStart(2, "0")}:00`, end = `${String(hour + 1).padStart(2, "0")}:59`;
    let draft = (await call("/api/activity-drafts", { method: "POST", status: 201, body: {} })).data;
    const category = await db.categoriaActividad.findFirstOrThrow({ where: { activo: true } });
    const audience = await db.publicoObjetivo.findUniqueOrThrow({ where: { slug: "adultos" } });
    const day = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"][new Date(`${today}T12:00Z`).getUTCDay()];
    const payload = { ...draft.payload, nombre: `${run}_QR_${Date.now()}`, modalidadOperacion: "HORARIO_FIJO", categoriaActividadId: category.id, publicosObjetivoIds: [audience.id], establecimientoIds: [venueId], cupo: 4, generacionClasesDesde: today, generacionClasesHasta: null, schedules: [{ establecimientoId: venueId, diaSemana: day, horaInicio: start, horaFin: end, cupoMaximo: 4, profesorIds: [], recursoIds: [] }] };
    draft = (await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload } })).data;
    const activity = (await call(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", status: 201, body: { expectedUpdatedAt: draft.updatedAt } })).data;
    created.push({ type: "activity", id: activity.id });
    await call(`/api/actividades/${activity.id}`, { method: "PATCH", body: { modalidadInscripcion: "POR_CLASE" } });
    const schedule = await db.horarioActividad.findFirstOrThrow({ where: { actividadId: activity.id } });
    currentClass = (await call(`/api/activity-sessions?activityId=${activity.id}&dateFrom=${today}&dateTo=${today}`)).data[0];
    await call("/api/enrollments", { method: "POST", status: 201, body: { usuarioId: user("c6").id, actividadId: activity.id, horarioActividadIds: [schedule.id] } });
    await call(`/api/citizen/classes/${currentClass.id}/reserve`, { role: "c6", method: "POST", status: 201 });
    currentQr = (await call(`/api/users/${user("c6").id}/qr`, { method: "POST", status: 201 })).data.token;
    const r = await validate(currentQr);
    assert.equal(r.reason, "USUARIO_HABILITADO"); assert.equal(r.allowed, true); assert.equal(r.matchedSession.id, currentClass.id);
    assert.ok(await db.asistencia.count({ where: { claseActividadId: currentClass.id, estado: "PRESENTE", origen: "ACCESO" } }));
    return "Real local time, today's generated date, confirmed reservation: allowed access and automatic attendance.";
  });
  await test("QR-ESTABLISHMENT-STATE-AND-EXPIRED-CLASS", async () => {
    assert.ok(currentQr && currentClass);
    const second = await db.establecimiento.findFirstOrThrow({ where: { id: { not: venueId }, activo: true } });
    const elsewhere = await call("/api/access/qr/validate", { role: "reception", method: "POST", status: 201, body: { establishmentId: second.id, qrToken: currentQr } });
    assert.equal(elsewhere.reason, "ESTABLECIMIENTO_INCORRECTO");
    await call(`/api/activity-sessions/${currentClass.id}`, { method: "PATCH", body: { status: "SUSPENDIDA", cancellationReason: `${run} suspended` } });
    assert.equal((await validate(currentQr)).reason, "CLASE_SUSPENDIDA");
    await call(`/api/activity-sessions/${currentClass.id}`, { method: "PATCH", body: { status: "FINALIZADA" } });
    assert.equal((await validate(currentQr)).reason, "SIN_CLASE_HABILITADA");
    return "Wrong venue, suspended class and completed class each deny with the correct reason.";
  });
  let requirement;
  await test("DOC-REQUIREMENT-AND-CITIZEN-SEARCH", async () => {
    requirement = (await call("/api/requirements", { method: "POST", status: 201, body: { nombre: `${run} documento`, tipo: "DOCUMENTO", requiereDocumento: true, documentoPersonal: true, instrucciones: "QA_TEST no real information" } })).data;
    created.push({ type: "requirement", id: requirement.id });
    const row = await db.usuario.findUniqueOrThrow({ where: { id: user("c0").id } });
    for (const q of [row.apellido, row.documento, row.email]) {
      const r = await call(`/api/user-documents/citizens?q=${encodeURIComponent(q)}`, { role: "reception" });
      const found = r.data.items.find(u => u.id === row.id); assert.ok(found); assert.equal(found.identityPhotoUrl, row.fotoPerfilUrl);
    }
    return "Reception document selector finds exact fake citizen with same identity photo by name, DNI and long email.";
  });
  const form = (file, userId = user("c0").id) => { const f = new FormData(); f.set("userId", userId); f.set("requirementId", requirement.id); if (file) f.set("file", file); return f; };
  await test("DOC-EMPTY-UNSUPPORTED-MISMATCH-OVERSIZE", async () => {
    for (const f of [null, new File([], "QA_TEST.pdf", { type: "application/pdf" }), new File(["fake"], "QA_TEST.exe", { type: "application/octet-stream" }), new File(["fake"], "QA_TEST.png", { type: "application/pdf" }), new File([new Uint8Array(10 * 1024 * 1024 + 1)], "QA_TEST.pdf", { type: "application/pdf" })]) await call("/api/reception/documents", { role: "reception", method: "POST", body: form(f), status: 400 });
    assert.equal(await db.documentoUsuario.count({ where: { requisitoId: requirement.id } }), 0);
    return "Missing, zero-size, executable, mismatching extension and >10 MB rejected before Storage; no document rows.";
  });
  await test("DOC-ROLES-AND-STORAGE-FAILURE-ATOMICITY", async () => {
    const pdf = new File(["%PDF-1.4\nQA_TEST\n%%EOF"], "QA_TEST.pdf", { type: "application/pdf" });
    for (const role of ["admin", "teacher", "citizen"]) await call("/api/reception/documents", { role, method: "POST", body: form(pdf), status: 403 });
    for (const [mime, extension] of [["application/pdf", "pdf"], ["image/png", "png"], ["image/jpeg", "jpg"]]) await call("/api/reception/documents", { role: "reception", method: "POST", body: form(new File(["QA_TEST"], `QA_TEST.${extension}`, { type: mime })), status: 500 });
    assert.equal(await db.documentoUsuario.count({ where: { requisitoId: requirement.id } }), 0);
    return "Only reception can call this flow. Allowed file types reach disabled loopback Storage and fail without orphan DB rows. Positive upload remains BLOCKED.";
  });
  await test("RBAC-DASHBOARD-ALIASES-FOUR-ROLES", async () => {
    for (const route of ["summary", "activity-trends", "attendance-trends", "capacity"]) for (const role of ["admin", "teacher", "reception", "citizen"]) await call(`/api/dashboard/${route}`, { role, status: role === "admin" ? 200 : 403 });
    const unauth = await fetch("http://localhost:3000/api/dashboard/summary"); assert.equal(unauth.status, 401);
    const invalid = await fetch("http://localhost:3000/api/dashboard/summary", { headers: { Authorization: "Bearer QA_TEST_invalid_expired_session" } }); assert.equal(invalid.status, 401);
    return "All four shared handlers enforce the existing administration workspace; absent/invalid authentication returns 401.";
  });
  await test("REGRESSION-TEACHER-AND-CITIZEN-OWNERSHIP", async () => {
    assert.equal((await call(`/api/activity-sessions?activityId=${a.id}`, { role: "teacher" })).data.length, 0);
    assert.equal((await call(`/api/enrollments?activityId=${a.id}`, { role: "teacher" })).data.length, 0);
    const enrollment = await db.inscripcion.findFirstOrThrow({ where: { usuarioId: user("c0").id, horarioActividadId: a.scheduleId } });
    const before = await db.inscripcion.findUniqueOrThrow({ where: { id: enrollment.id } });
    await call(`/api/citizen/enrollments/${enrollment.id}`, { role: "c1", method: "DELETE", body: { reason: run }, status: [403, 404] });
    assert.deepEqual(await db.inscripcion.findUniqueOrThrow({ where: { id: enrollment.id } }), before);
    return "Teacher generic queries remain scoped; another citizen cannot cancel by manipulating enrollment ID.";
  });
} finally { save(); await db.$disconnect(); }
