/* eslint-disable @typescript-eslint/no-explicit-any -- Sandbox loader mirrors scripts/test-activity-drafts.ts. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { activityDraftPayloadSchema, type ActivityDraftPayload } from "../src/features/activity-workflow/schemas/activity-draft.schema";
import { buildTeacherSlots } from "../src/features/activity-workflow/helpers/teacher-slot-assignments";

const operationalWrite = () => { throw new Error("Unexpected operational mutation"); };
const sourcePath = resolve("src/features/activity-workflow/services/activity-drafts.server.ts");
const localRequire = createRequire(sourcePath);
const mockedRequire = (name: string) => {
  if (name === "@/lib/db") return { prisma: {} };
  if (name === "@/features/actividades/services/actividades.server") return { createActividad: operationalWrite, patchActividad: operationalWrite, purgeActivity: operationalWrite, getActividad: operationalWrite };
  if (name === "@/features/activity-schedules/services/activity-schedules.server") return { assertActivityScheduleAvailability: operationalWrite, createActivitySchedule: operationalWrite, updateActivitySchedule: operationalWrite };
  if (name === "@/features/activity-sessions/services/activity-sessions.server") return { generateActivitySessionsBulk: operationalWrite, syncGeneratedSessionTeachers: operationalWrite };
  if (name === "@/features/teacher/services/teacher-assignment-notifications.server") return { notifyTeacherAssignmentChanges: operationalWrite };
  return localRequire(name);
};
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const server = {} as typeof import("../src/features/activity-workflow/services/activity-drafts.server");
runInThisContext(`(function(exports, require) { ${compiled}\n})`, { filename: sourcePath })(server, mockedRequire);

type Schedule = ActivityDraftPayload["schedules"][number];
const MODALIDADES = ["HORARIO_FIJO", "TURNO_RECURRENTE", "TURNO_PUNTUAL", "ACCESO_LIBRE", "EVENTO_UNICO", "CURSO_PERIODO"] as const;

function buildSchedule(modalidad: (typeof MODALIDADES)[number], overrides: Partial<Schedule> = {}): Schedule {
  const usesTurns = ["TURNO_RECURRENTE", "TURNO_PUNTUAL"].includes(modalidad);
  const needsTeacher = !["ACCESO_LIBRE", "TURNO_PUNTUAL"].includes(modalidad);
  const horaInicio = overrides.horaInicio ?? "08:00";
  const horaFin = overrides.horaFin ?? "09:00";
  const duracionTurnoMinutos = overrides.duracionTurnoMinutos !== undefined ? overrides.duracionTurnoMinutos : (usesTurns ? 30 : null);
  const intervaloTurnoMinutos = overrides.intervaloTurnoMinutos ?? (usesTurns ? 5 : 0);
  const profesorIds = overrides.profesorIds ?? (needsTeacher || usesTurns ? ["prof-1"] : []);
  const teacherAssignments = overrides.teacherAssignments ?? (
    usesTurns
      ? buildTeacherSlots({ horaInicio, horaFin }, duracionTurnoMinutos, intervaloTurnoMinutos, true).map((slot) => ({ ...slot, professorIds: profesorIds.length ? [...profesorIds] : [] }))
      : []
  );
  return {
    establecimientoId: overrides.establecimientoId ?? "est-1",
    diaSemana: overrides.diaSemana ?? "LUNES",
    horaInicio, horaFin,
    espacio: null,
    cupoMaximo: overrides.cupoMaximo ?? 10,
    duracionTurnoMinutos,
    intervaloTurnoMinutos,
    profesorIds,
    recursoIds: [],
    teacherAssignments,
  };
}

function buildPayload(modalidad: (typeof MODALIDADES)[number], schedules: Schedule[], dateOverrides: Partial<ActivityDraftPayload> = {}): ActivityDraftPayload {
  const desde = modalidad === "ACCESO_LIBRE" ? null : "2026-10-01";
  const hasta = modalidad === "ACCESO_LIBRE" ? null : modalidad === "EVENTO_UNICO" ? "2026-10-01" : "2026-10-15";
  return activityDraftPayloadSchema.parse({
    modalidadOperacion: modalidad,
    nombre: "Actividad de prueba",
    categoriaActividadId: "cat-1",
    schedules,
    generacionClasesDesde: desde,
    generacionClasesHasta: hasta,
    ...dateOverrides,
  });
}

function pendingKeys(payload: ActivityDraftPayload) {
  return server.activityDraftPending(payload).map((item) => `${item.step}:${item.key}`);
}

let checks = 0;
function expectEmpty(label: string, payload: ActivityDraftPayload) {
  checks += 1;
  const pending = pendingKeys(payload);
  assert.deepEqual(pending, [], `${label}: expected no pending items, got ${JSON.stringify(pending)}`);
}
function expectPending(label: string, payload: ActivityDraftPayload, key: string) {
  checks += 1;
  const pending = pendingKeys(payload);
  assert.ok(pending.some((item) => item.endsWith(`:${key}`)), `${label}: expected pending "${key}", got ${JSON.stringify(pending)}`);
}

// 1) Cada modalidad, un solo horario en una sola sede, correctamente completado -> publicable.
for (const modalidad of MODALIDADES) {
  const payload = buildPayload(modalidad, [buildSchedule(modalidad)]);
  expectEmpty(`single-sede ${modalidad}`, payload);
}

// 2) Multi-sede: mismo día/hora, profesores distintos -> publicable (no hay conflicto real).
{
  const payload = buildPayload("HORARIO_FIJO", [
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-1", profesorIds: ["prof-1"] }),
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-2", profesorIds: ["prof-2"] }),
  ]);
  expectEmpty("multi-sede distintos profesores", payload);
}

// 3) Multi-sede: mismo día/hora, MISMO profesor en sedes distintas -> debe bloquear (bug reportado).
{
  const payload = buildPayload("HORARIO_FIJO", [
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-1", profesorIds: ["prof-1"] }),
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-2", profesorIds: ["prof-1"] }),
  ]);
  expectPending("multi-sede mismo profesor superpuesto", payload, "profesor-solapado");
}

// 3b) Mismo profesor pero en horarios que NO se superponen -> publicable.
{
  const payload = buildPayload("HORARIO_FIJO", [
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-1", horaInicio: "08:00", horaFin: "09:00", profesorIds: ["prof-1"] }),
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-2", horaInicio: "09:00", horaFin: "10:00", profesorIds: ["prof-1"] }),
  ]);
  expectEmpty("mismo profesor, horarios consecutivos sin superposición", payload);
}

// 4) Misma sede, horarios superpuestos -> debe bloquear.
{
  const payload = buildPayload("HORARIO_FIJO", [
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-1", horaInicio: "08:00", horaFin: "09:00", profesorIds: ["prof-1"] }),
    buildSchedule("HORARIO_FIJO", { establecimientoId: "est-1", horaInicio: "08:30", horaFin: "09:30", profesorIds: ["prof-2"] }),
  ]);
  expectPending("misma sede horarios superpuestos", payload, "horario-solapado");
}

// 5) Horario sin sede asignada -> debe bloquear (el schema Zod ya lo impide al guardar;
// este chequeo defensivo cubre payloads legados que puedan saltarse esa validación).
{
  const payload = buildPayload("HORARIO_FIJO", [buildSchedule("HORARIO_FIJO")]);
  const withoutSede = { ...payload, schedules: [{ ...payload.schedules[0], establecimientoId: "" }] } as ActivityDraftPayload;
  expectPending("horario sin sede", withoutSede, "establecimiento-horario");
}

// 6) Datos generales incompletos -> debe bloquear.
{
  const payload = buildPayload("HORARIO_FIJO", [buildSchedule("HORARIO_FIJO")], {});
  const incomplete = { ...payload, nombre: "", categoriaActividadId: null };
  expectPending("sin nombre", incomplete, "nombre");
  expectPending("sin categoría", incomplete, "categoria");
}

// 7) Evento único con fechas distintas -> debe bloquear.
{
  const payload = buildPayload("EVENTO_UNICO", [buildSchedule("EVENTO_UNICO")], { generacionClasesDesde: "2026-10-01", generacionClasesHasta: "2026-10-02" });
  expectPending("evento único con rango de fechas", payload, "evento-fecha");
}

// 8) Rango de generación mayor a 6 meses -> debe bloquear.
{
  const payload = buildPayload("HORARIO_FIJO", [buildSchedule("HORARIO_FIJO")], { generacionClasesDesde: "2026-01-01", generacionClasesHasta: "2026-12-31" });
  expectPending("rango de generación excesivo", payload, "generacion-maxima");
}

// 9) Turno recurrente con un turno sin profesor asignado -> debe bloquear.
{
  const schedule = buildSchedule("TURNO_RECURRENTE");
  schedule.teacherAssignments = schedule.teacherAssignments.map((assignment) => ({ ...assignment, professorIds: [] }));
  const payload = buildPayload("TURNO_RECURRENTE", [schedule]);
  expectPending("turno recurrente sin cobertura docente", payload, "profesor-turno");
}

// 10) Turno puntual sin profesores preasignados -> publicable (asignación posterior por turno).
{
  const payload = buildPayload("TURNO_PUNTUAL", [buildSchedule("TURNO_PUNTUAL", { profesorIds: [], teacherAssignments: [] })]);
  expectEmpty("turno puntual sin profesor preasignado", payload);
}

console.log(`OK: ${checks} verificaciones sobre activityDraftPending cubriendo las 6 modalidades, multi-sede y los conflictos de horario/profesor.`);
