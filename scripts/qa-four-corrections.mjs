import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { ActividadEstado, RecursoTipo } from "@prisma/client";
import { realQaClient } from "./qa-real-client.mjs";

const q = await realQaClient(), { db, call, users } = q;
const run = `QA_TEST_FOUR_${Date.now()}`, output = "audit-evidence/four-corrections";
fs.mkdirSync(output, { recursive: true });
const results = [], fixtures = { activities: [], users: [] }, password = randomBytes(20).toString("base64url");
const save = () => { fs.writeFileSync(`${output}/integration.json`, JSON.stringify({ run, database: "127.0.0.1:55432/mas_sanmiguel_qa", apiInterception: false, results, fixtures, calls: q.calls }, null, 2)); fs.writeFileSync(".tmp/qa-postgres/four-corrections.private.json", JSON.stringify({ run, password, fixtures })); };
async function test(id, work) { try { results.push({ id, status: "PASS", detail: await work() }); } catch (e) { results.push({ id, status: "FAIL", detail: e.message }); } save(); console.log(`${id}: ${results.at(-1).status} ${results.at(-1).status === "FAIL" ? results.at(-1).detail : ""}`); }
async function person(label, role) {
  const r = await db.rol.findUniqueOrThrow({ where: { codigo: role } });
  const u = await call("/api/users", { method: "POST", status: 201, body: { userId: `${run}_${label}`, email: `${run}_${label}@example.invalid`, password, rolId: r.id, nombre: run, apellido: label } });
  fixtures.users.push({ ...u, label, role });
  if (role === "teacher") await db.profesor.upsert({ where: { usuarioId: u.id }, create: { usuarioId: u.id }, update: {} });
  return u;
}
const venueInput = { nombre: `${run}_venue`, direccion: `${run} Calle 123`, localidad: "Santa María", provincia: "Buenos Aires", direccionPlaceId: "manual:-34.55,-58.75", direccionLat: -34.55, direccionLng: -58.75, horarios: [] };
const venue = (await call("/api/establecimientos", { method: "POST", status: 201, body: venueInput })).data;
fixtures.venueId = venue.id;
const c1 = await person("c1", "citizen"), c2 = await person("c2", "citizen"), t1 = await person("t1", "teacher"), t2 = await person("t2", "teacher");
const teachers = await db.profesor.findMany({ where: { usuarioId: { in: [t1.id, t2.id] } } });
const requisito = await db.requisito.create({ data: { nombre: `${run}_document`, slug: run.toLowerCase(), tipo: "DOCUMENTO", requiereDocumento: true } });
const resource = await db.recurso.create({ data: { establecimientoId: venue.id, nombre: run, codigo: run, tipo: Object.values(RecursoTipo)[0] } });
async function activity(label, state = "ACTIVA", full = false) {
  const a = await db.actividad.create({ data: { id: randomUUID(), nombre: `${run}_${label}`, estado: state } });
  fixtures.activities.push({ id: a.id, name: a.nombre, label, state });
  if (!full) return { activity: a };
  const schedule = await db.horarioActividad.create({ data: { actividadId: a.id, establecimientoId: venue.id, diaSemana: "LUNES", horaInicio: "10:00", horaFin: "11:00", cupoMaximo: 10 } });
  const session = await db.claseActividad.create({ data: { horarioActividadId: schedule.id, establecimientoId: venue.id, fecha: new Date("2035-01-01"), horaInicio: "10:00", horaFin: "11:00", cupoMaximo: 10 } });
  const enrollments = [];
  for (const u of [c1, c2]) {
    const e = await db.inscripcion.create({ data: { usuarioId: u.id, horarioActividadId: schedule.id, estado: "CONFIRMADA" } }); enrollments.push(e);
    await db.inscripcionHorario.create({ data: { inscripcionId: e.id, horarioActividadId: schedule.id } });
    await db.reservaClase.create({ data: { usuarioId: u.id, claseActividadId: session.id, inscripcionId: e.id, estado: u.id === c1.id ? "RESERVADA" : "LISTA_ESPERA" } });
    await db.asistencia.create({ data: { claseActividadId: session.id, inscripcionId: e.id, estado: "PRESENTE", registradoPorId: users.admin.id } });
    await db.documentoInscripcion.create({ data: { inscripcionId: e.id, requisitoId: requisito.id, version: 1, nombreOriginal: "QA_TEST.txt", storagePath: `${run}/shared-metadata-only.txt`, mimeType: "text/plain", tamanioBytes: 1, requisitoNombreSnapshot: requisito.nombre, obligatorioSnapshot: true, subidoPorId: u.id } });
  }
  for (const [i, t] of teachers.entries()) { await db.horarioActividadProfesor.create({ data: { horarioActividadId: schedule.id, profesorId: t.id, esPrincipal: i === 0 } }); await db.claseActividadProfesor.create({ data: { claseActividadId: session.id, profesorId: t.id, esPrincipal: i === 0 } }); }
  const reservation = await db.reservaClase.findFirstOrThrow({ where: { claseActividadId: session.id } });
  const resourceReservation = await db.reservaRecurso.create({ data: { recursoId: resource.id, reservaClaseId: reservation.id, fecha: session.fecha, horaInicio: "10:00", horaFin: "11:00" } });
  await db.bloqueoRecurso.create({ data: { recursoId: resource.id, claseActividadId: session.id, fecha: session.fecha, horaInicio: "10:00", horaFin: "11:00", motivo: run } });
  await db.actividadRecurso.create({ data: { actividadId: a.id, recursoId: resource.id } });
  await db.horarioActividadRecurso.create({ data: { horarioActividadId: schedule.id, recursoId: resource.id } });
  await db.actividadRequisito.create({ data: { actividadId: a.id, requisitoId: requisito.id } });
  await db.actividadUsuario.create({ data: { actividadId: a.id, usuarioId: t1.id } });
  await db.actividadBorrador.create({ data: { actividadId: a.id, creadoPorId: users.admin.id, payload: {}, estado: "PUBLICADO", publicadoAt: new Date() } });
  const access = await db.registroAcceso.create({ data: { usuarioId: c1.id, establecimientoId: venue.id, claseActividadId: session.id, inscripcionId: enrollments[0].id, resultado: "PERMITIDO", motivo: "ACCESO_MANUAL_AUTORIZADO", origen: "MANUAL", registradoPorId: users.reception.id } });
  return { activity: a, schedule, session, enrollments, access, resourceReservation };
}
async function remove(a, status = 200, role = "admin") {
  assert.ok(a.nombre.startsWith(run), "Refusing to delete an old or unrelated activity");
  return call(`/api/actividades/${a.id}/lifecycle`, { method: "DELETE", role, status });
}
const notices = id => db.notificacion.findMany({ where: { deduplicationKey: `activity-purged:${id}` }, include: { entregas: true } });
async function verifyGone(f, expectedRecipients) {
  const id = f.activity.id;
  assert.equal(await db.actividad.count({ where: { id } }), 0);
  assert.equal((await db.$queryRaw`SELECT count(*)::int AS count FROM "Actividad" WHERE id=${id}`)[0].count, 0);
  assert.equal(await db.horarioActividad.count({ where: { actividadId: id } }), 0);
  assert.equal(await db.actividadBorrador.count({ where: { actividadId: id } }), 0);
  if (f.schedule) {
    for (const [model, where] of [["claseActividad", { horarioActividadId: f.schedule.id }], ["inscripcion", { horarioActividadId: f.schedule.id }], ["inscripcionHorario", { horarioActividadId: f.schedule.id }], ["horarioActividadProfesor", { horarioActividadId: f.schedule.id }], ["reservaClase", { claseActividadId: f.session.id }], ["asistencia", { claseActividadId: f.session.id }], ["claseActividadProfesor", { claseActividadId: f.session.id }], ["bloqueoRecurso", { claseActividadId: f.session.id }], ["documentoInscripcion", { inscripcionId: { in: f.enrollments.map(e => e.id) } }], ["reservaRecurso", { id: f.resourceReservation.id }]]) assert.equal(await db[model].count({ where }), 0, model);
    const access = await db.registroAcceso.findUniqueOrThrow({ where: { id: f.access.id } }); assert.equal(access.claseActividadId, null); assert.equal(access.inscripcionId, null);
  }
  const n = await notices(id);
  if (!expectedRecipients) assert.equal(n.length, 0);
  else { assert.equal(n.length, 1); assert.equal(n[0].entregas.length, expectedRecipients); assert.ok(n[0].mensaje.includes(f.activity.nombre)); assert.equal(n[0].actionUrl, null); assert.ok(n[0].entregas.every(d => d.estado === "NO_LEIDA")); }
  return { activityPhysicallyGone: true, notifications: n.length, recipients: n[0]?.entregas.length ?? 0 };
}
try {
  for (const [label, telefono, celular] of [["mobile-only", null, "1155551234"], ["fixed-only", "1144441234", null], ["both", "1144441234", "1155551234"], ["empty", null, null]]) await test(`PHONE-${label}`, async () => { const result = (await call(`/api/establecimientos/${venue.id}`, { method: "PUT", body: { ...venueInput, telefono, celular } })).data; assert.equal(result.telefono, telefono); assert.equal(result.celular, celular); const saved = await db.establecimiento.findUniqueOrThrow({ where: { id: venue.id } }); assert.equal(saved.telefono, telefono); assert.equal(saved.celular, celular); return { telefono, celular }; });
  await test("SANTA-MARIA-CATALOG-AND-RESTORE", async () => { const localities = (await call("/api/georef?resource=localities&provinceId=06&departmentId=06760")).data; for (const name of ["Santa María", "San Miguel", "Muñiz", "Bella Vista"]) assert.ok(localities.some(l => l.name === name)); const matches = (await call("/api/georef?resource=resolve-locality&provinceId=06&locality=Santa%20Mar%C3%ADa")).data; assert.equal(matches[0].departmentId, "06760"); return localities; });
  await test("MANUAL-COORDINATES-PERSISTENCE", async () => { const data = (await call(`/api/establecimientos/${venue.id}`)).data; assert.equal(data.direccionPlaceId, venueInput.direccionPlaceId); assert.equal(data.direccionLat, venueInput.direccionLat); assert.equal(data.direccionLng, venueInput.direccionLng); return "Manual ID and chosen coordinates survive readback; no invented automatic result."; });
  await q.authenticate("newCitizen", `${run}_c1`, password);
  await test("NOTIFICATIONS-OWN-ROLE-SINGLE-ALL-PERSISTENCE", async () => {
    const n = await db.notificacion.create({ data: { tipo: "GENERAL", titulo: `${run}_notice`, mensaje: run, audiencia: "ROL", entregas: { create: [{ usuarioId: c1.id, origen: "ROL" }, { usuarioId: c2.id, origen: "ROL" }] } }, include: { entregas: true } });
    const own = n.entregas.find(d => d.usuarioId === c1.id), other = n.entregas.find(d => d.usuarioId === c2.id);
    await call(`/api/citizen/notifications/${other.id}`, { role: "newCitizen", method: "PATCH", body: { action: "markAsRead" }, status: 404 });
    await call(`/api/citizen/notifications/${own.id}`, { role: "newCitizen", method: "PATCH", body: { action: "markAsRead" } });
    assert.equal((await call("/api/citizen/notifications", { role: "newCitizen" })).data.meta.unreadCount, 0);
    await call(`/api/citizen/notifications/${own.id}`, { role: "newCitizen", method: "PATCH", body: { action: "markAsUnread" } });
    await call("/api/citizen/notifications/read-all", { role: "newCitizen", method: "POST" });
    assert.equal((await db.entregaNotificacion.findUniqueOrThrow({ where: { id: own.id } })).estado, "LEIDA"); assert.equal((await db.entregaNotificacion.findUniqueOrThrow({ where: { id: other.id } })).estado, "NO_LEIDA");
    await q.authenticate("newCitizen", `${run}_c1`, password); assert.equal((await call("/api/citizen/notifications", { role: "newCitizen" })).data.meta.unreadCount, 0);
    await db.notificacion.create({ data: { tipo: "GENERAL", titulo: `${run}_new`, mensaje: run, entregas: { create: { usuarioId: c1.id } } } });
    assert.equal((await call("/api/citizen/notifications", { role: "newCitizen" })).data.meta.unreadCount, 1); return "Role delivery read, other user's delivery untouched, re-login persists, new notice increments.";
  });
  for (const state of Object.values(ActividadEstado)) await test(`PURGE-STATE-${state}`, async () => { const f = await activity(state, state); await remove(f.activity); return verifyGone(f, 0); });
  const keeper = await activity("KEEPER", "ACTIVA", true); fixtures.keeperId = keeper.activity.id;
  const keeperSnapshot = async () => ({ activity: await db.actividad.findUnique({ where: { id: keeper.activity.id } }), documents: await db.documentoInscripcion.findMany({ where: { inscripcionId: { in: keeper.enrollments.map(e => e.id) } } }), enrollments: await db.inscripcion.findMany({ where: { horarioActividadId: keeper.schedule.id } }), teachers: await db.horarioActividadProfesor.findMany({ where: { horarioActividadId: keeper.schedule.id } }) });
  await test("PURGE-FULL-GRAPH-SHARED-PEOPLE-OTHER-ACTIVITY-INTACT", async () => { const f = await activity("FULL", "ACTIVA", true), before = await keeperSnapshot(); const userRows = await db.usuario.findMany({ where: { id: { in: [c1.id, c2.id, t1.id, t2.id] } }, orderBy: { id: "asc" } }); await remove(f.activity); const gone = await verifyGone(f, 4); assert.deepEqual(await keeperSnapshot(), before); assert.deepEqual(await db.usuario.findMany({ where: { id: { in: [c1.id, c2.id, t1.id, t2.id] } }, orderBy: { id: "asc" } }), userRows); await remove(f.activity, 404); assert.equal((await notices(f.activity.id)).length, 1); return { ...gone, keeperIntact: true, usersIntact: true, retryDoesNotDuplicate: true }; });
  await test("PURGE-CONCURRENT-ONE-COMMIT", async () => { const f = await activity("CONCURRENT", "ACTIVA", true), offset = q.calls.length; await Promise.all([remove(f.activity, [200, 404, 409]), remove(f.activity, [200, 404, 409])]); const statuses = q.calls.slice(offset).map(r => r.status).sort(); assert.equal(statuses.filter(s => s === 200).length, 1); return { ...(await verifyGone(f, 4)), statuses }; });
  await test("PURGE-PERMISSIONS", async () => { const f = await activity("FORBIDDEN"); for (const role of ["teacher", "reception", "citizen"]) await remove(f.activity, 403, role); assert.equal(await db.actividad.count({ where: { id: f.activity.id } }), 1); return "Forbidden requests do not remove the activity or notify anyone."; });
  await test("PURGE-SHARED-CROSS-ACTIVITY-ENROLLMENT-SAFE-REFUSAL", async () => { const f = await activity("SHARED", "ACTIVA", true); await db.inscripcionHorario.create({ data: { inscripcionId: f.enrollments[0].id, horarioActividadId: keeper.schedule.id } }); const before = await keeperSnapshot(); await remove(f.activity, 409); assert.equal(await db.actividad.count({ where: { id: f.activity.id } }), 1); assert.equal((await notices(f.activity.id)).length, 0); assert.deepEqual(await keeperSnapshot(), before); return "Cross-activity enrollment cannot be removed without changing its semantics: controlled 409, no partial delete or false notification."; });
  await test("PURGE-CONCURRENT-ATTENDANCE-SAFE-CONFLICT", async () => {
    const f = await activity("ATTENDANCE_RACE");
    const schedule = await db.horarioActividad.create({ data: { actividadId: f.activity.id, establecimientoId: venue.id, diaSemana: "LUNES", horaInicio: "10:00", horaFin: "11:00", cupoMaximo: 5 } });
    const session = await db.claseActividad.create({ data: { horarioActividadId: schedule.id, establecimientoId: venue.id, fecha: new Date("2035-01-01"), horaInicio: "10:00", horaFin: "11:00" } });
    const enrollment = await db.inscripcion.create({ data: { horarioActividadId: schedule.id, usuarioId: c1.id, estado: "CONFIRMADA" } });
    let release, locked;
    const ready = new Promise(r => { locked = r; }), wait = new Promise(r => { release = r; });
    const hold = db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "ClaseActividad" WHERE id=${session.id} FOR UPDATE`;
      locked(); await wait;
      return tx.asistencia.create({ data: { claseActividadId: session.id, inscripcionId: enrollment.id, estado: "PRESENTE" } });
    }, { timeout: 60000 });
    await ready;
    const removal = remove(f.activity, 409);
    let blocked = false, attendance;
    try {
      for (let i = 0; i < 150; i++) {
        const rows = await db.$queryRaw`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'DELETE%' AND query LIKE '%ClaseActividad%'`;
        if (rows.length) { blocked = true; break; }
        await new Promise(r => setTimeout(r, 100));
      }
    } finally { release(); attendance = await hold; }
    await removal;
    assert.ok(blocked, "Purge must reach the locked class before the concurrent attendance commits");
    assert.ok(await db.actividad.findUnique({ where: { id: f.activity.id } }));
    assert.ok(await db.claseActividad.findUnique({ where: { id: session.id } }));
    assert.ok(await db.asistencia.findUnique({ where: { id: attendance.id } }));
    assert.equal((await notices(f.activity.id)).length, 0);
    await remove(f.activity);
    assert.equal(await db.claseActividad.count({ where: { id: session.id } }), 0);
    assert.equal(await db.asistencia.count({ where: { id: attendance.id } }), 0);
    assert.equal(await db.inscripcion.count({ where: { id: enrollment.id } }), 0);
    return { ...(await verifyGone(f, 1)), concurrentStatus: 409, noOrphans: true, noFalseNotifications: true, retrySucceeded: true };
  });
  await test("PURGE-LATE-FAILURE-REAL-POSTGRES-ROLLBACK", async () => {
    const f = await activity("ROLLBACK", "ACTIVA", true); let release, locked;
    const ready = new Promise(r => { locked = r; }), wait = new Promise(r => { release = r; });
    const hold = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM "ReservaRecurso" WHERE id=${f.resourceReservation.id} FOR UPDATE`; locked(); await wait; }, { timeout: 60000 });
    await ready;
    const removal = remove(f.activity, 500);
    let pid;
    try { for (let i = 0; i < 100; i++) { const blocked = await db.$queryRaw`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%ReservaRecurso%' AND query LIKE 'DELETE%' AND pid<>pg_backend_pid()`; if (blocked.length === 1) { pid = blocked[0].pid; break; } await new Promise(r => setTimeout(r, 100)); } assert.ok(pid, "Own purge must reach the locked resource DELETE"); await db.$queryRaw`SELECT pg_cancel_backend(${pid}::int)`; await removal; } finally { release(); await hold; }
    assert.equal(await db.actividad.count({ where: { id: f.activity.id } }), 1); assert.equal(await db.inscripcion.count({ where: { horarioActividadId: f.schedule.id } }), 2); assert.equal((await notices(f.activity.id)).length, 0); await remove(f.activity); return { ...(await verifyGone(f, 4)), realCancelledTransactionRolledBack: true };
  });
} finally { save(); await db.$disconnect(); }
assert.ok(results.every(r => r.status === "PASS"), "Inspect four-corrections evidence");
