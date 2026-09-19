/* eslint-disable @typescript-eslint/no-explicit-any -- Sandbox loader mirrors scripts/test-activity-drafts.ts, adapted for class-reservations.server.ts. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";

// ---------------------------------------------------------------------------
// In-memory data store standing in for the real database.
// ---------------------------------------------------------------------------
let idSeq = 1;
const nextId = (prefix: string) => `${prefix}-${idSeq++}`;

const establishments = new Map<string, any>();
const activities = new Map<string, any>();
const schedules = new Map<string, any>();
const clases = new Map<string, any>();
const users = new Map<string, any>();
const inscripciones = new Map<string, any>();
const reservas = new Map<string, any>();

function addEstablishment(id: string, nombre: string) { establishments.set(id, { id, nombre }); return id; }
function addActivity(overrides: any) { const activity = { modalidadInscripcion: "POR_CLASE", horasCancelacionJustificada: 24, nombre: overrides.id, ...overrides }; activities.set(activity.id, activity); return activity; }
function addSchedule(overrides: any) { const schedule = { cupoMaximo: 10, ...overrides }; schedules.set(schedule.id, schedule); return schedule; }
function addClass(overrides: any) { const clase = { estado: "PROGRAMADA", cupoMaximo: null, ...overrides }; clases.set(clase.id, clase); return clase; }
function addUser(overrides: any) { const user = { estadoParticipacion: "HABILITADO", ...overrides }; users.set(user.id, user); return user; }
function addEnrollment(overrides: any) { const id = overrides.id ?? nextId("insc"); const row = { estado: "CONFIRMADA", createdAt: new Date(), horarios: [], ...overrides, id }; inscripciones.set(id, row); return row; }

function matchScalar(value: any, cond: any): boolean {
  if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
    if ("not" in cond) return value !== cond.not;
    if ("in" in cond) return (cond.in as any[]).includes(value);
    throw new Error(`Operador Prisma no soportado en el mock: ${JSON.stringify(cond)}`);
  }
  return value === cond;
}
function matchWhere(row: any, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true;
    if (key === "AND") return (cond as any[]).every((w) => matchWhere(row, w));
    if (key === "OR") return (cond as any[]).some((w) => matchWhere(row, w));
    if (key === "horarios") return (row.horarios ?? []).some((item: any) => matchWhere(item, (cond as any).some));
    return matchScalar(row[key], cond);
  });
}
function joinSchedule(id: string) {
  const schedule = schedules.get(id);
  if (!schedule) return null;
  const activity = activities.get(schedule.actividadId);
  return { ...schedule, actividad: activity, establecimiento: establishments.get(schedule.establecimientoId) };
}
function populateEnrollment(row: any) {
  return { ...row, horarioActividad: joinSchedule(row.horarioActividadId), horarios: (row.horarios ?? []).map((item: any) => ({ ...item, horarioActividad: joinSchedule(item.horarioActividadId) })) };
}

// --- class-reservations.server.ts's own tx surface -------------------------------------------------
const crTx = {
  $queryRaw: async () => [],
  usuario: { async findUnique({ where }: any) { const user = users.get(where.id); return user ? { estadoParticipacion: user.estadoParticipacion } : null; } },
  claseActividad: {
    async findUnique({ where }: any) {
      const clase = clases.get(where.id);
      if (!clase) return null;
      const schedule = schedules.get(clase.horarioActividadId);
      const activity = activities.get(schedule.actividadId);
      return { id: clase.id, fecha: clase.fecha, horaInicio: clase.horaInicio, horaFin: clase.horaFin, estado: clase.estado, cupoMaximo: clase.cupoMaximo, horarioActividadId: schedule.id, horarioActividad: { id: schedule.id, diaSemana: schedule.diaSemana, cupoMaximo: schedule.cupoMaximo, actividad: activity, recursos: [] }, establecimiento: establishments.get(clase.establecimientoId ?? schedule.establecimientoId) };
    },
  },
  inscripcion: {
    async count({ where }: any) { return [...inscripciones.values()].filter((row) => matchWhere(row, where)).length; },
    async findFirst({ where }: any) { const rows = [...inscripciones.values()].filter((row) => matchWhere(row, where)); return rows[0] ?? null; },
    async findMany({ where }: any) { return [...inscripciones.values()].filter((row) => matchWhere(row, where)).map(populateEnrollment); },
  },
  reservaClase: {
    async count({ where }: any) { return [...reservas.values()].filter((row) => matchWhere(row, where)).length; },
    async findUnique({ where }: any) { const key = `${where.claseActividadId_usuarioId.claseActividadId}:${where.claseActividadId_usuarioId.usuarioId}`; return reservas.get(key) ?? null; },
    async findMany({ where, select }: any) {
      const rows = [...reservas.values()].filter((row) => matchWhere(row, where));
      if (!select?.claseActividad) return rows;
      return rows.map((row) => { const clase = clases.get(row.claseActividadId); const schedule = schedules.get(clase.horarioActividadId); const activity = activities.get(schedule.actividadId); return { claseActividad: { fecha: clase.fecha, horaInicio: clase.horaInicio, horaFin: clase.horaFin, horarioActividad: { actividad: { nombre: activity.nombre } } } }; });
    },
    async create({ data }: any) { const id = nextId("resv"); const row = { ...data, id, createdAt: new Date(), updatedAt: new Date() }; reservas.set(`${data.claseActividadId}:${data.usuarioId}`, row); return row; },
    async update({ where, data }: any) { const entry = [...reservas.entries()].find(([, row]) => row.id === where.id); if (!entry) throw new Error("reserva no encontrada"); const next = { ...entry[1], ...data, updatedAt: new Date() }; reservas.set(entry[0], next); return next; },
  },
  bloqueoRecurso: { async aggregate() { return { _sum: { cantidad: 0 } }; } },
};
const crPrisma = { async $transaction(fn: any) { return fn(crTx); } };

// --- enrollments.server.ts's tx surface, used only for assertNoEnrollmentConflicts ------------------
const enrollTx = { inscripcion: { async findMany({ where }: any) { return [...inscripciones.values()].filter((row) => matchWhere(row, where)).map(populateEnrollment); } } };

const operationalWrite = async () => {};
function loadModule<T>(relativePath: string, mockedRequireFor: (name: string) => any): T {
  const sourcePath = resolve(relativePath);
  const localRequire = createRequire(sourcePath);
  const mockedRequire = (name: string) => mockedRequireFor(name) ?? localRequire(name);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const moduleExports = {} as T;
  runInThisContext(`(function(exports, require) { ${compiled}\n})`, { filename: sourcePath })(moduleExports, mockedRequire);
  return moduleExports;
}

const enrollmentsServer = loadModule<typeof import("../src/features/enrollments/services/enrollments.server")>(
  "src/features/enrollments/services/enrollments.server.ts",
  (name) => {
    if (name === "@/lib/db") return { prisma: { async $transaction(fn: any) { return fn(enrollTx); } } };
    if (name === "@/features/citizen/services/citizen-enrollment-document-notifications.server") return { notifyCitizenEnrollmentMissingDocuments: operationalWrite };
    if (name === "@/features/enrollment-documents/services/enrollment-documents.server") return { getEnrollmentDocumentationSummaries: async () => new Map() };
    if (name === "@/features/notifications/services/notifications.server") return { createNotification: operationalWrite, notifyAdministrators: operationalWrite };
    if (name === "@/features/audit-log/services/audit-log.server") return { createAuditLogTx: operationalWrite };
    return undefined;
  },
);

const classReservationsServer = loadModule<typeof import("../src/features/class-reservations/services/class-reservations.server")>(
  "src/features/class-reservations/services/class-reservations.server.ts",
  (name) => {
    if (name === "@/lib/db") return { prisma: crPrisma };
    if (name === "@/features/notifications/services/notifications.server") return { createNotifications: operationalWrite, notifyAdministrators: operationalWrite };
    if (name === "@/features/resources/services/resource-booking.server") return { releaseReservationResources: operationalWrite, reserveAutomaticResources: operationalWrite };
    if (name === "@/features/enrollments/services/enrollments.server") return { assertNoEnrollmentConflicts: enrollmentsServer.assertNoEnrollmentConflicts };
    return undefined;
  },
);

// ---------------------------------------------------------------------------
// Fixtures: un profesor de "turno puntual" con varias clases sueltas, más una
// actividad recurrente aparte, para probar que reserveCitizenClass tampoco
// deja anotarse a dos lugares al mismo tiempo.
// ---------------------------------------------------------------------------
const SEDE_CENTRO = addEstablishment("est-centro", "Sede Centro");
const SEDE_NORTE = addEstablishment("est-norte", "Sede Norte");
const CITIZEN = addUser({ id: "user-1" }).id;

addActivity({ id: "act-turno-puntual", modalidadOperacion: "TURNO_PUNTUAL", modalidadInscripcion: "POR_CLASE" });
addSchedule({ id: "sch-turno-puntual", actividadId: "act-turno-puntual", establecimientoId: SEDE_CENTRO, diaSemana: "MIERCOLES", horaInicio: "14:00", horaFin: "20:00" });
addClass({ id: "cls-a", horarioActividadId: "sch-turno-puntual", establecimientoId: SEDE_CENTRO, fecha: new Date("2026-12-02T00:00:00.000Z"), horaInicio: "14:00", horaFin: "14:30" });
addClass({ id: "cls-b-overlap", horarioActividadId: "sch-turno-puntual", establecimientoId: SEDE_CENTRO, fecha: new Date("2026-12-02T00:00:00.000Z"), horaInicio: "14:15", horaFin: "14:45" });
addClass({ id: "cls-c-no-overlap", horarioActividadId: "sch-turno-puntual", establecimientoId: SEDE_CENTRO, fecha: new Date("2026-12-02T00:00:00.000Z"), horaInicio: "15:00", horaFin: "15:30" });
addClass({ id: "cls-d-other-week", horarioActividadId: "sch-turno-puntual", establecimientoId: SEDE_CENTRO, fecha: new Date("2026-12-09T00:00:00.000Z"), horaInicio: "14:00", horaFin: "14:30" });

addActivity({ id: "act-horario-fijo", modalidadOperacion: "HORARIO_FIJO", modalidadInscripcion: "PERMANENTE" });
addSchedule({ id: "sch-horario-fijo", actividadId: "act-horario-fijo", establecimientoId: SEDE_NORTE, diaSemana: "MIERCOLES", horaInicio: "09:00", horaFin: "10:00" });
addClass({ id: "cls-recurrente-conflicto", horarioActividadId: "sch-turno-puntual", establecimientoId: SEDE_CENTRO, fecha: new Date("2026-12-16T00:00:00.000Z"), horaInicio: "09:15", horaFin: "09:45" });

// La ciudadana ya está inscripta (CONFIRMADA) en la actividad recurrente, miércoles 09:00-10:00, Sede Norte.
addEnrollment({ id: "insc-horario-fijo", usuarioId: CITIZEN, horarioActividadId: "sch-horario-fijo", modalidad: "PERMANENTE", estado: "CONFIRMADA" });
// Y ya tiene la inscripción "paraguas" del turno puntual, requisito para reservar clases sueltas.
addEnrollment({ id: "insc-turno-puntual", usuarioId: CITIZEN, horarioActividadId: "sch-turno-puntual", modalidad: "POR_CLASE", estado: "CONFIRMADA" });

let checks = 0;
async function expectSuccess(label: string, run: () => Promise<any>) { checks += 1; const result = await run(); assert.ok(result, `${label}: se esperaba una reserva creada`); }
async function expectRejection(label: string, run: () => Promise<any>, messageIncludes: string) { checks += 1; await assert.rejects(run, (error: any) => { assert.ok(String(error.message).includes(messageIncludes), `${label}: mensaje inesperado "${error.message}"`); return true; }); }

async function main() {
  // 1) Primera clase puntual: sin conflictos -> se puede reservar.
  await expectSuccess("Primera clase puntual (14:00-14:30)", () => classReservationsServer.reserveCitizenClass(CITIZEN, "cls-a"));

  // 2) Otra clase puntual de la MISMA actividad, mismo día calendario, horario superpuesto (14:15-14:45) -> debe bloquearse.
  await expectRejection("Segunda clase puntual superpuesta con la primera", () => classReservationsServer.reserveCitizenClass(CITIZEN, "cls-b-overlap"), "Ya tenés una reserva");

  // 3) Clase puntual sin superposición real (15:00-15:30, mismo día) -> permitida.
  await expectSuccess("Clase puntual sin superposición, mismo día", () => classReservationsServer.reserveCitizenClass(CITIZEN, "cls-c-no-overlap"));

  // 4) Misma franja horaria (14:00-14:30) pero en OTRA fecha calendario -> permitida (no es el mismo día).
  await expectSuccess("Misma franja horaria, otra fecha calendario", () => classReservationsServer.reserveCitizenClass(CITIZEN, "cls-d-other-week"));

  // 5) Clase puntual que se superpone con la inscripción recurrente semanal (miércoles 09:00-10:00) -> debe bloquearse.
  await expectRejection("Clase puntual superpuesta con actividad recurrente", () => classReservationsServer.reserveCitizenClass(CITIZEN, "cls-recurrente-conflicto"), "ya está inscripta");

  console.log(`OK: ${checks} verificaciones sobre reserveCitizenClass cubriendo el solapamiento entre clases puntuales y contra actividades recurrentes.`);
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
