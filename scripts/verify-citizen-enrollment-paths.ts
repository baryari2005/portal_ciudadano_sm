/* eslint-disable @typescript-eslint/no-explicit-any -- Sandbox loader mirrors scripts/test-activity-drafts.ts, adapted for enrollments.server.ts. */
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

const establishments = new Map<string, { id: string; nombre: string }>();
const activities = new Map<string, any>();
const schedules = new Map<string, any>();
const clases = new Map<string, any>();
const users = new Map<string, any>();
const inscripciones = new Map<string, any>();
const reservas = new Map<string, any>();

function addEstablishment(id: string, nombre: string) { establishments.set(id, { id, nombre }); return id; }
function addActivity(overrides: Partial<any> & { id: string; modalidadOperacion: string }) {
  const activity = { estado: "ACTIVA", nivel: null, modalidadInscripcion: "PERMANENTE", duracionPeriodoMeses: null, publicosObjetivo: [], requisitos: [], nombre: overrides.id, ...overrides };
  activities.set(activity.id, activity);
  return activity;
}
function addSchedule(overrides: Partial<any> & { id: string; actividadId: string; establecimientoId: string; diaSemana: string; horaInicio: string; horaFin: string }) {
  const schedule = { estado: "ACTIVO", cupoMaximo: 10, permiteSobrecupo: false, sobrecupoMaximo: null, permiteListaEspera: true, duracionTurnoMinutos: null, ...overrides };
  schedules.set(schedule.id, schedule);
  return schedule;
}
function addClass(overrides: Partial<any> & { id: string; horarioActividadId: string; horaInicio: string; horaFin: string }) {
  const clase = { estado: "PROGRAMADA", fecha: new Date("2026-12-04T00:00:00.000Z"), ...overrides };
  clases.set(clase.id, clase);
  return clase;
}
function addUser(overrides: Partial<any> & { id: string }) {
  const user = { nombre: "Test", apellido: "Citizen", documento: "0", email: "test@example.com", fechaNacimiento: null, genero: null, estadoParticipacion: "HABILITADO", ...overrides };
  users.set(user.id, user);
  return user;
}

function joinSchedule(id: string) {
  const schedule = schedules.get(id);
  if (!schedule) return null;
  const activity = activities.get(schedule.actividadId);
  const establecimiento = establishments.get(schedule.establecimientoId);
  return { ...schedule, actividad: { ...activity, imagenUrl: null }, establecimiento };
}

function matchScalar(value: any, cond: any): boolean {
  if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
    if ("not" in cond) return value !== cond.not;
    if ("in" in cond) return (cond.in as any[]).includes(value);
    if ("gte" in cond) return value != null && value >= cond.gte;
    throw new Error(`Operador Prisma no soportado en el mock: ${JSON.stringify(cond)}`);
  }
  return value === cond;
}
function matchWhere(row: any, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (cond === undefined) return true; // Prisma ignora los campos "undefined" en un where.
    if (key === "AND") return (cond as any[]).every((w) => matchWhere(row, w));
    if (key === "OR") return (cond as any[]).some((w) => matchWhere(row, w));
    if (key === "horarios") return (row.horarios ?? []).some((item: any) => matchWhere(item, (cond as any).some));
    return matchScalar(row[key], cond);
  });
}
function populate(row: any) {
  const user = users.get(row.usuarioId);
  return {
    ...row,
    usuario: { id: user.id, userId: user.id, nombre: user.nombre, apellido: user.apellido, documento: user.documento, email: user.email, avatarUrl: null, deletedAt: null },
    horarioActividad: joinSchedule(row.horarioActividadId),
    horarios: (row.horarios ?? []).map((item: any) => ({ ...item, horarioActividad: joinSchedule(item.horarioActividadId) })),
  };
}

const tx = {
  usuario: { async findFirst({ where }: any) { const user = users.get(where.id); return user ? { id: user.id, fechaNacimiento: user.fechaNacimiento, genero: user.genero, estadoParticipacion: user.estadoParticipacion } : null; } },
  $queryRaw: async () => [],
  claseActividad: {
    async findUnique({ where }: any) {
      const clase = clases.get(where.id);
      if (!clase) return null;
      const schedule = schedules.get(clase.horarioActividadId);
      const activity = activities.get(schedule.actividadId);
      return { fecha: clase.fecha, horaInicio: clase.horaInicio, horaFin: clase.horaFin, estado: clase.estado, horarioActividadId: clase.horarioActividadId, horarioActividad: { actividadId: activity.id, estado: schedule.estado, actividad: { modalidadOperacion: activity.modalidadOperacion } } };
    },
  },
  actividad: {
    async findUnique({ where }: any) {
      const activity = activities.get(where.id);
      if (!activity) return null;
      const horarios = [...schedules.values()].filter((s) => s.actividadId === activity.id && s.estado === "ACTIVO").sort((a, b) => a.diaSemana.localeCompare(b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio));
      return { modalidadOperacion: activity.modalidadOperacion, horarios: horarios.map((s) => ({ id: s.id })) };
    },
  },
  horarioActividad: { async findUnique({ where }: any) { return joinSchedule(where.id); } },
  documentoUsuario: { async findMany() { return []; } },
  reservaClase: {
    async upsert({ where, create, update }: any) {
      const key = `${where.claseActividadId_usuarioId.claseActividadId}:${where.claseActividadId_usuarioId.usuarioId}`;
      const row = reservas.has(key) ? { ...reservas.get(key), ...update } : { ...create };
      reservas.set(key, row);
      return row;
    },
  },
  inscripcion: {
    async count({ where }: any) { return [...inscripciones.values()].filter((row) => matchWhere(row, where)).length; },
    async findFirst({ where }: any) { const rows = [...inscripciones.values()].filter((row) => matchWhere(row, where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); return rows[0] ? populate(rows[0]) : null; },
    async findMany({ where }: any) { return [...inscripciones.values()].filter((row) => matchWhere(row, where)).map(populate); },
    async create({ data }: any) {
      const id = nextId("insc");
      const row = { ...data, id, createdAt: new Date(), updatedAt: new Date(), horarios: data.horarios?.create ?? [] };
      inscripciones.set(id, row);
      return populate(row);
    },
    async update({ where, data }: any) {
      const current = inscripciones.get(where.id);
      if (!current) throw new Error("Inscripción no encontrada en el mock");
      const next = { ...current, ...data, updatedAt: new Date() };
      if (data.horarios) next.horarios = data.horarios.create ?? [];
      inscripciones.set(where.id, next);
      return populate(next);
    },
  },
};
const prisma = { async $transaction(fn: any) { return fn(tx); } };

const operationalWrite = async () => {};
const sourcePath = resolve("src/features/enrollments/services/enrollments.server.ts");
const localRequire = createRequire(sourcePath);
const mockedRequire = (name: string) => {
  if (name === "@/lib/db") return { prisma };
  if (name === "@/features/citizen/services/citizen-enrollment-document-notifications.server") return { notifyCitizenEnrollmentMissingDocuments: operationalWrite };
  if (name === "@/features/enrollment-documents/services/enrollment-documents.server") return { getEnrollmentDocumentationSummaries: async () => new Map() };
  if (name === "@/features/notifications/services/notifications.server") return { createNotification: operationalWrite, notifyAdministrators: operationalWrite };
  if (name === "@/features/audit-log/services/audit-log.server") return { createAuditLogTx: operationalWrite };
  return localRequire(name);
};
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const server = {} as typeof import("../src/features/enrollments/services/enrollments.server");
runInThisContext(`(function(exports, require) { ${compiled}\n})`, { filename: sourcePath })(server, mockedRequire);

// ---------------------------------------------------------------------------
// Fixtures: two sedes, one citizen, one activity per modalidad.
// ---------------------------------------------------------------------------
const SEDE_CENTRO = addEstablishment("est-centro", "Sede Centro");
const SEDE_NORTE = addEstablishment("est-norte", "Sede Norte");
const CITIZEN = addUser({ id: "user-1" }).id;

addActivity({ id: "act-horario-fijo", modalidadOperacion: "HORARIO_FIJO" });
addSchedule({ id: "sch-horario-fijo", actividadId: "act-horario-fijo", establecimientoId: SEDE_CENTRO, diaSemana: "LUNES", horaInicio: "08:00", horaFin: "09:00" });

addActivity({ id: "act-turno-recurrente", modalidadOperacion: "TURNO_RECURRENTE" });
addSchedule({ id: "sch-turno-recurrente", actividadId: "act-turno-recurrente", establecimientoId: SEDE_CENTRO, diaSemana: "MARTES", horaInicio: "10:00", horaFin: "11:00", duracionTurnoMinutos: 30 });

addActivity({ id: "act-turno-puntual", modalidadOperacion: "TURNO_PUNTUAL", modalidadInscripcion: "POR_CLASE" });
addSchedule({ id: "sch-turno-puntual", actividadId: "act-turno-puntual", establecimientoId: SEDE_CENTRO, diaSemana: "MIERCOLES", horaInicio: "14:00", horaFin: "15:00", duracionTurnoMinutos: 30 });
addClass({ id: "cls-turno-puntual", horarioActividadId: "sch-turno-puntual", horaInicio: "14:00", horaFin: "14:30" });

addActivity({ id: "act-acceso-libre", modalidadOperacion: "ACCESO_LIBRE" });
addSchedule({ id: "sch-acceso-libre", actividadId: "act-acceso-libre", establecimientoId: SEDE_CENTRO, diaSemana: "JUEVES", horaInicio: "09:00", horaFin: "10:00" });

addActivity({ id: "act-evento-unico", modalidadOperacion: "EVENTO_UNICO", modalidadInscripcion: "POR_CLASE" });
addSchedule({ id: "sch-evento-unico", actividadId: "act-evento-unico", establecimientoId: SEDE_NORTE, diaSemana: "VIERNES", horaInicio: "18:00", horaFin: "20:00" });
addClass({ id: "cls-evento-unico", horarioActividadId: "sch-evento-unico", horaInicio: "18:00", horaFin: "20:00" });

addActivity({ id: "act-curso-periodo", modalidadOperacion: "CURSO_PERIODO", modalidadInscripcion: "POR_PERIODO", duracionPeriodoMeses: 3 });
addSchedule({ id: "sch-curso-periodo", actividadId: "act-curso-periodo", establecimientoId: SEDE_NORTE, diaSemana: "LUNES", horaInicio: "16:00", horaFin: "17:00" });

// Overlap fixtures: same citizen, same day (LUNES), different sedes.
addActivity({ id: "act-overlap-b", modalidadOperacion: "HORARIO_FIJO" });
addSchedule({ id: "sch-overlap-b", actividadId: "act-overlap-b", establecimientoId: SEDE_NORTE, diaSemana: "LUNES", horaInicio: "08:30", horaFin: "09:30" });
addActivity({ id: "act-overlap-c", modalidadOperacion: "HORARIO_FIJO" });
addSchedule({ id: "sch-overlap-c", actividadId: "act-overlap-c", establecimientoId: SEDE_NORTE, diaSemana: "LUNES", horaInicio: "09:00", horaFin: "10:00" });

// Second Friday event at a different sede, same time as act-evento-unico -> probes whether
// POR_CLASE (evento único / turno puntual) enrollments are checked for overlap at all.
addActivity({ id: "act-evento-unico-2", modalidadOperacion: "EVENTO_UNICO", modalidadInscripcion: "POR_CLASE" });
addSchedule({ id: "sch-evento-unico-2", actividadId: "act-evento-unico-2", establecimientoId: SEDE_CENTRO, diaSemana: "VIERNES", horaInicio: "18:00", horaFin: "20:00" });
addClass({ id: "cls-evento-unico-2", horarioActividadId: "sch-evento-unico-2", horaInicio: "18:00", horaFin: "20:00" });

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
let checks = 0;
async function expectSuccess(label: string, run: () => Promise<any>) {
  checks += 1;
  const result = await run();
  assert.ok(result?.id, `${label}: se esperaba una inscripción creada`);
  return result;
}
async function expectRejection(label: string, run: () => Promise<any>, messageIncludes: string) {
  checks += 1;
  await assert.rejects(run, (error: any) => { assert.ok(String(error.message).includes(messageIncludes), `${label}: mensaje inesperado "${error.message}", se esperaba que incluyera "${messageIncludes}"`); return true; });
}

async function main() {
  // 1) Cobertura por modalidad: la ciudadana puede anotarse a todas las que lo requieren.
  await expectSuccess("HORARIO_FIJO", () => server.createEnrollment({ usuarioId: CITIZEN, actividadId: "act-horario-fijo" } as any));
  await expectSuccess("TURNO_RECURRENTE (horario completo)", () => server.createEnrollment({ usuarioId: CITIZEN, actividadId: "act-turno-recurrente", horarioActividadId: "sch-turno-recurrente" } as any));
  await expectSuccess("TURNO_PUNTUAL (por clase)", () => server.createEnrollment({ usuarioId: CITIZEN, claseActividadId: "cls-turno-puntual" } as any));
  await expectSuccess("EVENTO_UNICO (por clase)", () => server.createEnrollment({ usuarioId: CITIZEN, claseActividadId: "cls-evento-unico" } as any));
  await expectSuccess("CURSO_PERIODO", () => server.createEnrollment({ usuarioId: CITIZEN, actividadId: "act-curso-periodo" } as any));
  await expectRejection("ACCESO_LIBRE no requiere inscripción", () => server.createEnrollment({ usuarioId: CITIZEN, actividadId: "act-acceso-libre" } as any), "acceso libre");

  // Re-enrolling in the exact same schedule must be rejected as a duplicate, not as an overlap.
  await expectRejection("Reinscripción al mismo horario", () => server.createEnrollment({ usuarioId: CITIZEN, actividadId: "act-horario-fijo" } as any), "ya posee una inscripción activa en este horario");

  // 2) Solapamiento entre sedes distintas: LUNES 08:00-09:00 (Centro) ya ocupado.
  await expectRejection("Solapamiento entre sedes distintas (08:30-09:30 Norte)", () => server.createEnrollment({ usuarioId: CITIZEN, actividadId: "act-overlap-b" } as any), "ya está inscripta");

  // 3) Horario consecutivo (09:00-10:00), sin solapamiento real, distinta sede -> debe permitirse.
  await expectSuccess("Horario consecutivo sin solapamiento, otra sede", () => server.createEnrollment({ usuarioId: CITIZEN, actividadId: "act-overlap-c" } as any));

  // 4) Los dos eventos únicos (POR_CLASE) del mismo día/hora, en sedes distintas -> también deben bloquearse.
  await expectRejection("Dos eventos POR_CLASE simultáneos en sedes distintas", () => server.createEnrollment({ usuarioId: CITIZEN, claseActividadId: "cls-evento-unico-2" } as any), "ya está inscripta");

  console.log(`OK: ${checks} verificaciones sobre createEnrollment cubriendo las modalidades y el solapamiento de horario/sede (incluido POR_CLASE).`);
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
