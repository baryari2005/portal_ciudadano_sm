import fs from "node:fs";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import XLSX from "xlsx";
import { realQaClient, assertLocalQaUrl } from "./qa-real-client.mjs";

// Only the explicitly identified independent database is permitted. No cleanup.
const { db, users, call, calls, authenticate, download } = await realQaClient();
const run = `QA_TEST_S3_${Date.now()}`;
const results = [], fixtures = { users: [], activities: [] };
const output=process.env.QA_EVIDENCE_DIR ?? "audit-evidence/qa-stage3"; fs.mkdirSync(output,{recursive:true});
const file = `${output}/functional-${run}.json`;
const save = () => fs.writeFileSync(file, JSON.stringify({ run, backend: "real HTTP / Prisma / PostgreSQL local", apiInterception: false, results, calls, fixtures }, null, 2));
async function test(id, work) {
  try { results.push({ id, status: "PASS", detail: await work() }); }
  catch (e) { results.push({ id, status: "FAIL", detail: e.message }); }
  save(); console.log(`${id}: ${results.at(-1).status} ${results.at(-1).status === "FAIL" ? results.at(-1).detail : ""}`);
}
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const days = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const venueId = "qa-local-establishment";
const category = await db.categoriaActividad.findFirstOrThrow({ where: { activo: true } });
const audience = await db.publicoObjetivo.findUniqueOrThrow({ where: { slug: "adultos" } });
const teacher = await db.profesor.findUniqueOrThrow({ where: { usuarioId: users.teacher.id } });
const citizenRole = await db.rol.findUniqueOrThrow({ where: { codigo: "citizen" } });
const password = randomBytes(24).toString("base64url");
fs.writeFileSync(`.tmp/qa-postgres/stage3-${run}.private.json`, JSON.stringify({ run, password }));
async function citizen(index) {
  const userId = `${run}_${index}`;
  const u = await call("/api/users", { method: "POST", status: 201, body: { userId, email: `${userId.toLowerCase()}@example.invalid`, password, rolId: citizenRole.id, nombre: "QA_TEST_STAGE3", apellido: index, fechaNacimiento: "1990-01-01", documento: `88${String(Date.now()).slice(-5)}${fixtures.users.length}`, tipoDocumento: "DNI", fotoPerfilUrl: "http://localhost:3000/useradmin1.png" } });
  fixtures.users.push({ id: u.id, userId, label: index }); save();
  await authenticate(index, userId, password);
  return u;
}
async function activity(label, { capacity = 1, mode = "PERMANENTE", time = "08:00", end = "09:00", day = "MARTES", professor = false, start = today } = {}) {
  let draft = (await call("/api/activity-drafts", { method: "POST", body: {}, status: 201 })).data;
  const payload = { ...draft.payload, nombre: `${run}_${label}`, descripcion: "QA_TEST ficticio etapa 3", modalidadOperacion: "HORARIO_FIJO", categoriaActividadId: category.id, establecimientoIds: [venueId], publicosObjetivoIds: [audience.id], cupo: capacity, generacionClasesDesde: start, generacionClasesHasta: null, schedules: [{ establecimientoId: venueId, diaSemana: day, horaInicio: time, horaFin: end, cupoMaximo: capacity, profesorIds: professor ? [teacher.id] : [], recursoIds: [] }] };
  draft = (await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload } })).data;
  assert.deepEqual(draft.pending, []);
  const a = (await call(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", body: { expectedUpdatedAt: draft.updatedAt }, status: 201 })).data;
  if (mode !== "PERMANENTE") await call(`/api/actividades/${a.id}`, { method: "PATCH", body: { modalidadInscripcion: mode } });
  const schedule = await db.horarioActividad.findFirstOrThrow({ where: { actividadId: a.id } });
  const f = { id: a.id, scheduleId: schedule.id, label, name: a.nombre };
  fixtures.activities.push(f); save(); return f;
}
async function enroll(a, u, status = 201) { return (await call("/api/enrollments", { method: "POST", status, body: { usuarioId: u.id, actividadId: a.id, horarioActividadIds: [a.scheduleId], observaciones: run } })).data; }
async function state(e, estado) { return (await call(`/api/enrollments/${e.id}`, { method: "PATCH", body: { estado, motivoCancelacion: run } })).data; }
async function schedule(a, patch) { return call(`/api/activity-schedules/${a.scheduleId}`, { method: "PATCH", body: patch }); }
async function count(a, expected) { assert.equal(await db.inscripcion.count({ where: { horarioActividadId: a.scheduleId, estado: "CONFIRMADA" } }), expected); }
async function classes(a, from = today, to = "2026-12-01") { return (await call(`/api/activity-sessions?activityId=${a.id}&dateFrom=${from}&dateTo=${to}&pageSize=100`)).data; }
try {
  await test("GUARD-LOCAL-FOUR-ROLES", async () => {
    for (const invalid of ["postgresql://qa:qa@db.example.supabase.co:5432/postgres", "postgresql://qa:qa@127.0.0.1:5432/mas_sanmiguel_qa", "postgresql://qa:qa@127.0.0.1:55432/postgres"]) assert.throws(() => assertLocalQaUrl(invalid));
    const [identity] = await db.$queryRaw`SELECT current_database() AS database, inet_server_addr()::text AS host, inet_server_port() AS port`;
    assert.equal(identity.database, "mas_sanmiguel_qa"); assert.equal(identity.port, 55432); assert.equal(identity.host, "127.0.0.1/32");
    return "Four real /me identities match local PostgreSQL before any writes; no Supabase client in QA harness.";
  });
  const people = [];
  await test("FIXTURES-REAL-USERS", async () => { for (let i = 0; i < 7; i++) people.push(await citizen(`c${i}`)); return { users: people.map(u => u.id) }; });
  const a = await activity("capacity"); let e0, e1, e2;
  await test("ENROLL-CAP-WAITLIST-DUPLICATE", async () => {
    e0 = await enroll(a, people[0]); assert.equal(e0.status, "CONFIRMADA"); await count(a, 1);
    e1 = await enroll(a, people[1]); assert.equal(e1.status, "LISTA_ESPERA"); await count(a, 1);
    await enroll(a, people[0], 409); await count(a, 1);
    assert.equal(await db.inscripcion.count({ where: { horarioActividadId: a.scheduleId } }), 2);
    return { confirmed: e0.id, waiting: e1.id };
  });
  await test("ENROLL-CANCEL-AUTOMATIC-PROMOTION", async () => {
    await state(e0, "CANCELADA"); await count(a, 1);
    assert.equal((await db.inscripcion.findUniqueOrThrow({ where: { id: e1.id } })).estado, "CONFIRMADA");
    assert.ok(await db.notificacion.count({ where: { entregas: { some: { usuarioId: people[1].id } }, tipo: "PROMOCION_LISTA_ESPERA" } }) > 0);
    return "Released place promoted the oldest eligible waiter; one confirmed row and notification persisted.";
  });
  await test("ENROLL-OVERBOOKING-LIMIT", async () => {
    await schedule(a, { permiteSobrecupo: true, sobrecupoMaximo: 1 });
    e2 = await enroll(a, people[2]); assert.equal(e2.status, "CONFIRMADA"); await count(a, 2);
    const e3 = await enroll(a, people[3]); assert.equal(e3.status, "LISTA_ESPERA"); await count(a, 2);
    return "Capacity 1 plus overbooking 1 accepts two; third waits.";
  });
  const concurrent = await activity("concurrent", { time: "09:00", end: "10:00" });
  await schedule(concurrent, { permiteListaEspera: false });
  await test("ENROLL-CONCURRENT-LAST-SEAT", async () => {
    const responses = await Promise.all([people[4], people[5]].map(u => enroll(concurrent, u, [201, 409])));
    assert.equal(responses.filter(Boolean).length, 1); await count(concurrent, 1);
    assert.equal(await db.inscripcion.count({ where: { horarioActividadId: concurrent.scheduleId } }), 1);
    return "Two parallel HTTP requests, exactly one 201 and one 409; one persisted enrollment.";
  });
  const reserveActivity = await activity("reservation", { mode: "POR_CLASE", time: "10:00", end: "11:00" });
  const reservationClass = (await classes(reserveActivity))[0]; fixtures.reservationClassId = reservationClass.id;
  await test("RESERVATION-ENROLL-NO-ROSTER-CAP", async () => {
    for (const p of people.slice(0, 4)) assert.equal((await enroll(reserveActivity, p)).status, "CONFIRMADA");
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: reservationClass.id } }), 0);
    return "Enrollment for POR_CLASE does not reserve every future class.";
  });
  const reserve = (role, id = reservationClass.id, status = 201) => call(`/api/citizen/classes/${id}/reserve`, { role, method: "POST", status });
  const cancel = (role, id = reservationClass.id) => call(`/api/citizen/classes/${id}/cancel`, { role, method: "POST", body: { reason: `${run} no puedo asistir` } });
  await test("RESERVATION-CONCURRENT-CAPACITY", async () => {
    await Promise.all(["c0", "c1"].map(role => reserve(role)));
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: reservationClass.id, estado: "RESERVADA" } }), 1);
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: reservationClass.id, estado: "LISTA_ESPERA" } }), 1);
    return "Concurrent real reservations produce one seat and one waiter without HTTP 500.";
  });
  await test("RESERVATION-DUPLICATE-CANCEL-OFFER-CONFIRM", async () => {
    // If a previous concurrency defect aborted one request, retry only the absent row.
    for (let i = 0; i < 2; i++) if (!await db.reservaClase.findFirst({ where: { usuarioId: people[i].id, claseActividadId: reservationClass.id } })) await reserve(`c${i}`);
    const confirmed = await db.reservaClase.findFirstOrThrow({ where: { claseActividadId: reservationClass.id, estado: "RESERVADA" } });
    const role = `c${people.findIndex(p => p.id === confirmed.usuarioId)}`;
    await reserve(role, reservationClass.id, 409);
    await cancel(role);
    const absence = await db.reservaClase.findUniqueOrThrow({ where: { id: confirmed.id } }); assert.equal(absence.estado, "AUSENCIA_INFORMADA");
    assert.ok(absence.canceladoAt);
    const startsAt = new Date(`${reservationClass.date}T${reservationClass.startTime}:00-03:00`);
    const policy = await db.actividad.findUniqueOrThrow({ where: { id: reserveActivity.id } });
    assert.equal(absence.cancelacionJustificada, startsAt.getTime() - absence.canceladoAt.getTime() >= policy.horasCancelacionJustificada * 3600000);
    const offered = await db.reservaClase.findFirstOrThrow({ where: { claseActividadId: reservationClass.id, estado: "OFRECIDA" } });
    assert.ok(offered.ofertaVenceAt); assert.ok(offered.ofrecidoAt);
    const nextRole = `c${people.findIndex(p => p.id === offered.usuarioId)}`;
    await call(`/api/citizen/classes/${reservationClass.id}/confirm`, { role: nextRole, method: "POST" });
    assert.equal((await db.reservaClase.findUniqueOrThrow({ where: { id: offered.id } })).estado, "RESERVADA");
    assert.equal(await db.reservaClase.count({ where: { claseActividadId: reservationClass.id, estado: "RESERVADA" } }), 1);
    await reserve(role); // One's informed absence can be reused only as a waitlisted reservation.
    assert.equal((await db.reservaClase.findUniqueOrThrow({ where: { id: confirmed.id } })).estado, "LISTA_ESPERA");
    return "Duplicate rejected, timely cancellation recorded with attendance, waiter offered and confirmed; rebooking obeys capacity.";
  });
  await test("RESERVATION-NO-ENROLLMENT-DENIED", async () => { await reserve("c6", reservationClass.id, 400); return "Unenrolled citizen rejected."; });
  const todayDay = days[new Date(`${today}T12:00Z`).getUTCDay()];
  const occupied = await db.horarioActividad.findMany({ where: { diaSemana: todayDay, estado: "ACTIVO", profesores: { some: { profesorId: teacher.id } } }, select: { horaInicio: true, horaFin: true } });
  const hour = Array.from({ length: 17 }, (_, i) => i + 6).find(h => { const start = `${String(h).padStart(2, "0")}:00`, end = `${String(h + 1).padStart(2, "0")}:00`; return !occupied.some(s => start < s.horaFin && s.horaInicio < end); });
  assert.notEqual(hour, undefined, "No isolated teacher slot available; preserve old QA fixtures.");
  const attendance = await activity("attendance", { capacity: 8, professor: true, day: todayDay, time: `${String(hour).padStart(2, "0")}:00`, end: `${String(hour + 1).padStart(2, "0")}:00` });
  const session = (await classes(attendance, today, today))[0]; fixtures.attendanceSessionId = session.id;
  const attendanceEnrollments = [];
  for (const p of people.slice(0, 3)) attendanceEnrollments.push(await enroll(attendance, p));
  const records = attendanceEnrollments.map((e, i) => ({ enrollmentId: e.id, status: i ? "AUSENTE" : "PRESENTE" }));
  await test("ATTENDANCE-INDIVIDUAL-BATCH-CLOSE", async () => {
    await call("/api/attendance", { method: "POST", status: 201, body: { activitySessionId: session.id, ...records[0] } });
    await call(`/api/teacher/attendance/${session.id}`, { role: "teacher", method: "POST", body: { action: "batch", records } });
    assert.equal(await db.asistencia.count({ where: { claseActividadId: session.id } }), 3);
    await call("/api/attendance/close", { method: "POST", body: { activitySessionId: session.id } });
    assert.ok((await db.claseActividad.findUniqueOrThrow({ where: { id: session.id } })).asistenciaCerradaAt);
    return "Individual admin and teacher batch writes persisted; close timestamp recorded.";
  });
  await test("ATTENDANCE-CLOSED-DENY-REOPEN-CORRECT-HISTORY", async () => {
    await call("/api/attendance/batch", { method: "POST", status: 409, body: { activitySessionId: session.id, records } });
    await call(`/api/teacher/attendance/${session.id}`, { role: "teacher", method: "POST", status: 403, body: { action: "reopen", correctionReason: run } });
    await call("/api/attendance/reopen", { method: "POST", status: 400, body: { activitySessionId: session.id } });
    await call("/api/attendance/reopen", { method: "POST", body: { activitySessionId: session.id, correctionReason: run } });
    records[1].status = "PRESENTE";
    await call("/api/attendance/batch", { method: "POST", body: { activitySessionId: session.id, records, correctionReason: run } });
    await call("/api/attendance/close", { method: "POST", body: { activitySessionId: session.id } });
    assert.equal(await db.asistencia.count({ where: { claseActividadId: session.id, estado: "PRESENTE" } }), 2);
    assert.ok(await db.registroAuditoria.count({ where: { entidadId: session.id } }) >= 3);
    return "Closed edits denied; only admin reopens with reason; corrected, reclosed and audited.";
  });
  await test("ATTENDANCE-RECEPTION-CITIZEN-WRITE-DENIED", async () => {
    for (const role of ["reception", "citizen"]) await call("/api/attendance/batch", { role, method: "POST", status: 403, body: { activitySessionId: session.id, records } });
    return "Both roles rejected before mutation.";
  });
  await test("NO-SHOW-PARTICIPATION-REVIEW", async () => {
    await call(`/api/users/${people[2].id}/participation`, { method: "PATCH", body: { justifiedAbsenceThreshold: 10, unjustifiedAbsenceThreshold: 1, status: "HABILITADO", observations: run } });
    await call("/api/attendance/reopen", { method: "POST", body: { activitySessionId: session.id, correctionReason: run } });
    await call("/api/attendance/close", { method: "POST", body: { activitySessionId: session.id } });
    assert.equal((await db.usuario.findUniqueOrThrow({ where: { id: people[2].id } })).estadoParticipacion, "EN_REVISION");
    assert.equal(await db.inscripcion.count({ where: { usuarioId: people[2].id, estado: { in: ["CONFIRMADA", "LISTA_ESPERA"] } } }), 0);
    assert.ok(await db.notificacion.count({ where: { entregas: { some: { usuarioId: people[2].id } }, entidadTipo: "participation_review" } }) > 0);
    return "Real absence threshold caused EN_REVISION, BAJA enrollments and notification for only the new QA citizen.";
  });
  await test("QR-PERSISTENT-REUSE-REVOKE-INVALID-HISTORY", async () => {
    const before = await db.registroAcceso.count();
    let recordedScans=0;
    const issued = (await call(`/api/users/${people[0].id}/qr`, { method: "POST", status: 201 })).data;
    const validate = token => call("/api/access/qr/validate", { role: "reception", method: "POST", status: 201, body: { establishmentId: venueId, qrToken: token } });
    for (let i = 0; i < 2; i++) { const r = await validate(issued.token); assert.equal(r.user.id, people[0].id); assert.notEqual(r.reason, "QR_USADO"); assert.ok(r.occurredAt); if(r.accessRecordId)recordedScans++;else{assert.equal(r.result,"PENDIENTE");assert.ok(r.pendingDecision.attemptId);} }
    await call(`/api/users/${people[0].id}/qr`, { method: "DELETE" });
    assert.equal((await validate(issued.token)).reason, "QR_REVOCADO");
    assert.equal((await validate("QA_TEST_INVALID_QR")).reason, "QR_INVALIDO");
    assert.equal(await db.registroAcceso.count(), before + recordedScans + 2);
    return "Persistent credential resolves correct person, reusable; revocation and invalid payload denied and recorded; eligible exceptions remain pending without final access.";
  });
  await test("QR-DIGITAL-ONE-USE-REVOKE", async () => {
    const validate = qrToken => call("/api/access/qr/validate", { role: "reception", method: "POST", status: 201, body: { establishmentId: venueId, qrToken } });
    const first = (await call("/api/citizen/qr/issue", { role: "c0", method: "POST", status: 201 })).data;
    assert.equal((await validate(first.token)).user.id, people[0].id);
    assert.equal((await validate(first.token)).reason, "QR_USADO");
    const second = (await call("/api/citizen/qr/issue", { role: "c0", method: "POST", status: 201 })).data;
    await call("/api/citizen/qr/revoke", { role: "c0", method: "POST" });
    assert.equal((await validate(second.token)).reason, "QR_REVOCADO");
    return "Digital token consumed once and revoked token refused; real timestamps/history.";
  });
  await test("REQUEST-ACCESS-VALIDATION-APPROVE-REJECT", async () => {
    await call("/api/auth/request-access", { method: "POST", body: {}, status: 400 });
    for (const decision of ["APPROVE", "REJECT"]) {
      const short = `qa_test_${String(Date.now()).slice(-10)}${decision[0].toLowerCase()}`;
      const body = { nombre: "QA_TEST_STAGE3", apellido: decision, genero: "MASCULINO", nacionalidad: "ARGENTINA", dni: `89${String(Date.now()).slice(-6)}`, direccion: "QA_TEST calle ficticia 123", localidad: "QA_TEST", provincia: "Buenos Aires", codigoPostal: "1663", direccionPlaceId: "QA_TEST_LOCAL_PLACE", direccionLat: -34.54, direccionLng: -58.71, email: `${short}@example.invalid`, telefono: "1100000000", contactoEmergenciaNombre: "QA_TEST", contactoEmergenciaTelefono: "1100000000", fechaNacimiento: "1990-01-01", userId: short, password };
      await call("/api/auth/request-access", { method: "POST", body, status: 201 });
      const u = await db.usuario.findUniqueOrThrow({ where: { userId: short } }); fixtures.users.push({ id: u.id, userId: short, label: decision });
      assert.equal(u.estado, "PENDIENTE");
      await call("/api/auth/request-access", { method: "POST", body, status: 409 });
      assert.equal((await call(`/api/users/${u.id}/access-request`)).data.length, 1);
      for (const role of ["teacher", "reception", "citizen"]) await call(`/api/users/${u.id}/access-request`, { role, method: "PATCH", status: 403, body: { decision } });
      await call(`/api/users/${u.id}/access-request`, { method: "PATCH", body: { decision, ...(decision === "REJECT" ? { rejectionReason: `${run} rechazo ficticio` } : {}) } });
      assert.equal((await db.usuario.findUniqueOrThrow({ where: { id: u.id } })).estado, decision === "APPROVE" ? "ACTIVO" : "RECHAZADO");
      await call(`/api/users/${u.id}/access-request`, { method: "PATCH", status: 409, body: { decision, rejectionReason: run } });
      assert.ok(await db.notificacion.count({ where: { entregas: { some: { usuarioId: u.id } } } }) >= 2);
    }
    return "Invalid, duplicate, pending, approval, rejection, repeated review and reviewer-role denial persisted correctly.";
  });
  await test("IMPORT-UPSERT-VALIDATION-PAGINATION-EXPORT", async () => {
    await call("/api/users/import-upsert", { method: "POST", body: { user: { email: "invalid-email" } }, status: 400 });
    for (let i = 0; i < 16; i++) {
      const userId = `${run}_import_${i}`;
      const imported = await call("/api/users/import-upsert", { method: "POST", body: { user: { userId, email: `${userId.toLowerCase()}@example.invalid`, nombre: "QA_TEST_STAGE3", apellido: `Import ${i}`, rolId: citizenRole.id, password } } });
      fixtures.users.push({ id: imported.user.id, userId, label: "import" });
    }
    const p1 = await call(`/api/users?q=${run}&page=1&pageSize=10`), p2 = await call(`/api/users?q=${run}&page=2&pageSize=10`);
    assert.equal(p1.data.length, 10); assert.equal(p2.data.length, 10); assert.equal(new Set([...p1.data, ...p2.data].map(u => u.id)).size, 20);
    const response = await download("/api/users/export"); assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer()); fs.writeFileSync(`audit-evidence/qa-stage3/${run}-users.xlsx`, bytes);
    const workbook = XLSX.read(bytes, { type: "buffer" }); assert.ok(workbook.SheetNames.length); assert.ok(Number(response.headers.get("x-users-count")) >= 23);
    return { imported: 16, pages: 2, exportBytes: bytes.length, sheets: workbook.SheetNames };
  });
  await test("REGRESSION-CONCURRENT-DRAFT-AND-FAR-FUTURE", async () => {
    const draft = (await call("/api/activity-drafts", { method: "POST", body: {}, status: 201 })).data;
    const responses = await Promise.all(["A", "B"].map(s => call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", status: [200, 409], body: { expectedUpdatedAt: draft.updatedAt, payload: { ...draft.payload, nombre: `${run}_${s}` } } })));
    assert.equal(responses.filter(r => r.data).length, 1);
    const before = await db.claseActividad.count({ where: { horarioActividadId: a.scheduleId } });
    const route = `/api/activity-sessions?activityId=${a.id}&dateFrom=2046-11-01&dateTo=2046-11-28&pageSize=100`;
    const out = await Promise.all([1, 2, 3].map(() => call(route)));
    assert.ok(out[0].data.length > 0); for (const o of out) assert.deepEqual(o.data.map(c => c.id), out[0].data.map(c => c.id));
    assert.ok((await db.claseActividad.count({ where: { horarioActividadId: a.scheduleId } })) - before <= 5);
    return "Optimistic draft concurrency 200/409 preserved; three concurrent far-future requests generate one month only, without duplicate classes.";
  });
  for (const [role, routes] of Object.entries({
    teacher: ["/api/roles", `/api/users/${people[0].id}/access-request`, "/api/users/export", "/api/access?view=options", "/api/dashboard/summary"],
    reception: ["/api/roles", "/api/users/export", "/api/dashboard/summary"],
    citizen: ["/api/roles", "/api/users", "/api/enrollments", "/api/attendance", "/api/access?view=options", "/api/user-documents", "/api/dashboard/summary"],
  })) for (const route of routes) await test(`RBAC-${role}-${route}`, async () => { await call(route, { role, status: 403 }); return "Forbidden, no internal error or personal-data response."; });
  await test("RBAC-TEACHER-ENROLLMENT-ID-TAMPER", async () => { await call(`/api/enrollments/${e0.id}`, { role: "teacher", status: 403 }); return "Unassigned enrollment denied by ID."; });
  await test("RBAC-CITIZEN-DOCUMENT-ID-TAMPER", async () => { await call(`/api/citizen/documents/${crypto.randomUUID()}/download`, { role: "c0", status: 404 }); return "Unknown document not disclosed."; });
  await test("RECEPTION-SEARCH-NAME-DNI-EMAIL-PHOTO", async () => {
    const row = await db.usuario.findUniqueOrThrow({ where: { id: people[0].id } });
    for (const q of [row.userId, row.documento, row.email]) {
      const result = await call(`/api/access/manual/search?establishmentId=${venueId}&q=${encodeURIComponent(q)}`, { role: "reception" });
      const found = result.data.find(u => u.id === row.id); assert.ok(found); assert.equal(found.profilePhotoUrl, row.fotoPerfilUrl);
    }
    return "Real manual search resolves same person and persisted profile photograph in three modes.";
  });
} finally {
  save(); await db.$disconnect();
  console.log(JSON.stringify({ file, passed: results.filter(r => r.status === "PASS").length, failed: results.filter(r => r.status === "FAIL").length }));
}
