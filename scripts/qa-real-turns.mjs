import fs from "node:fs";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";
const { db, call, calls } = await realQaClient();
const fixtures = JSON.parse(fs.readFileSync(".tmp/qa-postgres/fixtures.json", "utf8"));
const results = [];
try {
  let draft = (await call("/api/activity-drafts", { method: "POST", body: {}, status: 201 })).data;
  const category = await db.categoriaActividad.findFirstOrThrow();
  const assignments = [
    { startTime: "13:00", endTime: "13:30", professorIds: [fixtures.professorId] },
    { startTime: "13:40", endTime: "14:10", professorIds: [] },
    { startTime: "14:20", endTime: "14:50", professorIds: [fixtures.secondProfessorId] },
  ];
  const payload = { ...draft.payload, modalidadOperacion: "TURNO_RECURRENTE", nombre: `QA_TEST_turns_${Date.now()}`, categoriaActividadId: category.id, establecimientoIds: [fixtures.venueId], cupo: 10,
    generacionClasesDesde: "2026-11-01", generacionClasesHasta: "2031-11-01", duracionTurnoMinutos: 30, intervaloTurnoMinutos: 10,
    schedules: [{ establecimientoId: fixtures.venueId, diaSemana: "LUNES", horaInicio: "13:00", horaFin: "15:00", cupoMaximo: 10, duracionTurnoMinutos: 30, intervaloTurnoMinutos: 10, profesorIds: [fixtures.professorId, fixtures.secondProfessorId], teacherAssignments: assignments, recursoIds: [] }] };
  draft = (await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload } })).data;
  assert.deepEqual(draft.pending, []);
  const activity = (await call(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", status: 201, body: { expectedUpdatedAt: draft.updatedAt } })).data;
  const route = `/api/activity-sessions?activityId=${activity.id}&dateFrom=2031-09-01&dateTo=2031-09-28&pageSize=100`;
  const classes = (await call(route)).data;
  assert.ok(classes.length >= 12);
  for (const session of classes) assert.deepEqual(session.professors.map(p => p.id).sort(), assignments.find(a => a.startTime === session.startTime).professorIds.slice().sort());
  results.push({ id: "TURNS-5-YEARS-PER-SLOT-OPTIONAL-TEACHERS", status: "PASS", detail: { activityId: activity.id, count: classes.length, mixedUnassignedAndAssigned: true } });
  draft = (await call("/api/activity-drafts", { method: "POST", body: { activityId: activity.id }, status: 201 })).data;
  assert.deepEqual(draft.payload.schedules[0].teacherAssignments, assignments);
  draft = (await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload: { ...draft.payload, descripcion: "QA_TEST informative edit retains per-slot configuration" } } })).data;
  await call(`/api/activity-drafts/${draft.id}/publish`, { method: "POST", body: { expectedUpdatedAt: draft.updatedAt } });
  assert.deepEqual((await call(route)).data.map(c => [c.id, c.professors.map(p => p.id)]), classes.map(c => [c.id, c.professors.map(p => p.id)]));
  results.push({ id: "TURNS-EDIT-RELOAD-NO-REGENERATION", status: "PASS", detail: "Per-slot teachers persisted in original JSON storage; same session IDs and assignments after edit." });
  fixtures.turnActivityId = activity.id;
  fs.writeFileSync(".tmp/qa-postgres/fixtures.json", JSON.stringify(fixtures, null, 2));
} catch (error) { results.push({ id: "TURNS-REGRESSION", status: "FAIL", detail: error.message }); }
finally { fs.writeFileSync("audit-evidence/qa-stage2/real-turns.json", JSON.stringify({ results, calls }, null, 2)); await db.$disconnect(); }
console.log(JSON.stringify(results));
