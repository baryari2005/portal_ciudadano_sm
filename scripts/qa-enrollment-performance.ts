import fs from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { PrismaClient, type HorarioActividad } from "@prisma/client";
import { assertLocalQaUrl } from "./qa-real-client.mjs";

async function main() {
  const phase = process.argv[2];
  if (!["before", "after"].includes(phase)) throw Error("Use before or after");
  const url = assertLocalQaUrl(/^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))![1]);
  Object.assign(process.env, { DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-disabled", SUPABASE_SERVICE_ROLE_KEY: "qa-disabled" });
  const db = new PrismaClient({ datasourceUrl: url.toString(), log: [{ emit: "event", level: "query" }] });
  (globalThis as typeof globalThis & { prisma: unknown }).prisma = db;
  const output = "audit-evidence/enrollment-performance";
  fs.mkdirSync(output, { recursive: true });
  const marker = `QA_TEST_PERF_${phase}_${Date.now()}`, rows: unknown[] = [];
  const accounts: { userId: string; password: string; id: string }[] = [];
  let events: { query: string; duration: number; params: string }[] | null = null;
  db.$on("query", event => events?.push({ query: event.query, duration: event.duration, params: event.params }));
  try {
    const admin = await db.usuario.findUniqueOrThrow({ where: { userId: "QA_TEST_admin" } });
    const role = await db.rol.findUniqueOrThrow({ where: { codigo: "citizen" } });
    const category = await db.categoriaActividad.findFirstOrThrow();
    const activityId = randomUUID();
    await db.actividad.create({ data: { id: activityId, nombre: marker, estado: "ACTIVA", modalidadOperacion: "HORARIO_FIJO", categoriaActividadId: category.id, cupo: 100, cupoMaximo: 100, imagenUrl: "http://localhost:3000/useradmin1.png" } });
    const schedules: HorarioActividad[] = [];
    for (const day of ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"] as const) schedules.push(await db.horarioActividad.create({ data: { actividadId: activityId, establecimientoId: "qa-local-establishment", diaSemana: day, horaInicio: "20:00", horaFin: "21:00", cupoMaximo: 100 } }));
    await db.actividadBorrador.create({ data: { creadoPorId: admin.id, actividadId: activityId, nombre: marker, estado: "PUBLICADO", publicadoAt: new Date(), payload: { __activity: { version: 1, startDate: "2026-10-01", endDate: null, excludedDates: [], schedules: schedules.map(s => ({ id: s.id, establecimientoId: s.establecimientoId, diaSemana: s.diaSemana, horaInicio: s.horaInicio, horaFin: s.horaFin, teacherAssignments: [] })) } } } });
    const citizen = await import("../src/features/citizen/services/citizen.server");
    async function measure(stage: string, sample: number, action: () => Promise<unknown>) {
      const before = await db.claseActividad.count({ where: { horarioActividad: { actividadId: activityId } } });
      events = []; const start = performance.now(); await action(); const elapsedMs = performance.now() - start;
      const trace = events; events = null;
      const after = await db.claseActividad.count({ where: { horarioActividad: { actividadId: activityId } } });
      const frequencies = new Map<string, number>();
      for (const event of trace) frequencies.set(event.query, (frequencies.get(event.query) ?? 0) + 1);
      const row = { stage, sample, kind: sample === 0 ? "first-service-call/fresh-actor" : "warm-service/fresh-actor", elapsedMs, sqlMs: trace.reduce((n, e) => n + e.duration, 0), queries: trace.length, transactions: trace.filter(e => e.query === "BEGIN").length, lockStatements: trace.filter(e => e.query.includes("FOR UPDATE")).length, generatedClasses: after - before, repeatedQueryExecutions: [...frequencies.values()].reduce((n, c) => n + Math.max(0, c - 1), 0), queryGroups: [...frequencies].map(([sql, count]) => ({ sql, count })) };
      rows.push(row); fs.writeFileSync(`${output}/${phase}-sql.json`, JSON.stringify({ marker, activityId, schedules: schedules.map(s => s.id), transport: "Actual service and Prisma against local PostgreSQL; HTTP/browser timings measured separately", rows }, null, 2));
      console.log(JSON.stringify({ stage, sample, elapsedMs: Math.round(elapsedMs), sqlMs: row.sqlMs, queries: row.queries, transactions: row.transactions, lockStatements: row.lockStatements, generatedClasses: row.generatedClasses }));
    }
    for (let i = 0; i < 3; i++) {
      const userId = `${marker}_${i}`, password = randomBytes(24).toString("base64url");
      // Fixtures are isolated; password hash comes from a fictitious QA account.
      const u = await db.usuario.create({ data: { userId, email: `${userId.toLowerCase()}@example.invalid`, password: await (await import("bcryptjs")).hash(password,10), rolId: role.id, nombre: "QA_TEST", apellido: `Performance ${i}`, fechaNacimiento: new Date("1990-01-01"), perfilCompleto: true } });
      accounts.push({ userId, password, id: u.id });
      await measure("detail", i, () => citizen.getCitizenActivity(u.id, activityId));
      await measure("confirmation", i, () => citizen.getCitizenActivity(u.id, activityId));
      await measure("submit", i, () => citizen.createCitizenEnrollment(u.id, { activityId, selectedSlots: schedules.map(s => ({ activityScheduleId: s.id, startTime: s.horaInicio, endTime: s.horaFin })), levelConsent: true }));
      await measure("post-submit-enrollments", i, () => citizen.listCitizenEnrollments(u.id));
    }
    fs.writeFileSync(`.tmp/qa-postgres/performance-${phase}.private.json`, JSON.stringify({ activityId, marker, schedules: schedules.map(s => s.id), accounts }, null, 2));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

