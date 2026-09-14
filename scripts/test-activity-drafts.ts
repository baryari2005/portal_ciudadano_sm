/* eslint-disable @typescript-eslint/no-explicit-any -- In-memory Prisma adapter for isolated concurrency tests. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { activityDraftPayloadSchema, saveActivityDraftSchema } from "../src/features/activity-workflow/schemas/activity-draft.schema";
import { draftFingerprint, draftHasChanges, nextDraftTimestamp, readDraftMetadata } from "../src/features/activity-workflow/helpers/draft-persistence";

const empty = activityDraftPayloadSchema.parse({});
assert.equal(draftHasChanges(empty, { baseline: draftFingerprint(empty) }), false);
assert.equal(draftHasChanges({ ...empty, nombre: "Pilates" }, { baseline: draftFingerprint(empty) }), true);
assert.equal(draftHasChanges(empty, null), true, "Legacy drafts must remain available");
assert.equal(draftFingerprint({ ...empty, publicosObjetivoIds: ["a", "b"] }), draftFingerprint({ ...empty, publicosObjetivoIds: ["b", "a"] }));
assert.equal(readDraftMetadata({ __draft: { baseline: 5 } }), null);
assert.equal(saveActivityDraftSchema.safeParse({ payload: empty }).success, false, "Every write must carry a version");
const now = new Date();
assert.ok(nextDraftTimestamp(now, now.getTime()).getTime() > now.getTime());

// Execute the actual server module with an isolated database adapter. No external database is touched.
const rows = new Map<string, any>();
let operationalWrites = 0;
let activity = {
  ...empty, id: "activity-1", nombre: "Pilates", updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  publicosObjetivo: [], requisitos: [], horarios: [],
};
function matches(row: any, where: any) {
  return (!where.id || row.id === where.id)
    && (!where.actividadId || row.actividadId === where.actividadId)
    && (!where.updatedAt || row.updatedAt.getTime() === where.updatedAt.getTime())
    && (!("publicadoAt" in where) || row.publicadoAt === where.publicadoAt)
    && (!where.estado || (typeof where.estado === "string" ? row.estado === where.estado : row.estado !== where.estado.not));
}
const drafts = {
  async create({ data }: any) {
    const row = { id: `draft-${rows.size + 1}`, nombre: "Actividad sin nombre", modalidad: null, actividadId: null, pasoActual: 1, publicadoAt: null, createdAt: new Date(), updatedAt: new Date(), ...data };
    rows.set(row.id, row);
    return structuredClone(row);
  },
  async findUnique({ where }: any) { return structuredClone([...rows.values()].find((row) => matches(row, where)) ?? null); },
  async findUniqueOrThrow(args: any) { const row = await drafts.findUnique(args); assert.ok(row); return row; },
  async findMany({ where }: any) { return structuredClone([...rows.values()].filter((row) => matches(row, where))); },
  async updateMany({ where, data }: any) {
    const row = [...rows.values()].find((item) => matches(item, where));
    if (!row) return { count: 0 };
    Object.assign(row, data, { updatedAt: data.updatedAt ?? nextDraftTimestamp(row.updatedAt) });
    return { count: 1 };
  },
  async update(args: any) { const result = await drafts.updateMany(args); assert.equal(result.count, 1); return drafts.findUniqueOrThrow({ where: { id: args.where.id } }); },
  async deleteMany({ where }: any) {
    const row = [...rows.values()].find((item) => matches(item, where));
    if (!row) return { count: 0 };
    rows.delete(row.id);
    return { count: 1 };
  },
};
const prisma = {
  actividadBorrador: drafts,
  actividad: { async findUnique() { return structuredClone(activity); } },
  async $transaction(callback: (tx: any) => unknown) { return callback(prisma); },
};
const operationalWrite = () => { operationalWrites += 1; throw new Error("Unexpected operational mutation"); };
const sourcePath = resolve("src/features/activity-workflow/services/activity-drafts.server.ts");
const localRequire = createRequire(sourcePath);
const mockedRequire = (name: string) => {
  if (name === "@/lib/db") return { prisma };
  if (name === "@/features/actividades/services/actividades.server") return { createActividad: operationalWrite, patchActividad: operationalWrite, purgeActivity: operationalWrite, getActividad: () => activity };
  if (name === "@/features/activity-schedules/services/activity-schedules.server") return { assertActivityScheduleAvailability: operationalWrite, createActivitySchedule: operationalWrite, updateActivitySchedule: operationalWrite };
  if (name === "@/features/activity-sessions/services/activity-sessions.server") return { generateActivitySessionsBulk: operationalWrite, syncGeneratedSessionTeachers: operationalWrite };
  if (name === "@/features/teacher/services/teacher-assignment-notifications.server") return { notifyTeacherAssignmentChanges: operationalWrite };
  return localRequire(name);
};
const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const server = {} as typeof import("../src/features/activity-workflow/services/activity-drafts.server");
runInThisContext(`(function(exports, require) { ${compiled}\n})`, { filename: sourcePath })(server, mockedRequire);

async function main() {
  const fresh = await server.createActivityDraft("admin-a");
  assert.equal(fresh.hasChanges, false);
  assert.equal((await server.listActivityDrafts()).length, 0);

  const edit = await server.createActivityEditDraft(activity.id, "admin-a");
  const reopened = await server.createActivityEditDraft(activity.id, "admin-b");
  assert.equal(edit.id, reopened.id);
  assert.equal(edit.updatedAt.getTime(), reopened.updatedAt.getTime(), "Opening an editor must not invalidate another editor");
  assert.equal((await server.listActivityDrafts()).length, 0);

  const unchanged = await server.saveActivityDraft(edit.id, "admin-a", edit.payload, edit.updatedAt.toISOString(), 3);
  assert.equal(unchanged.hasChanges, false);
  assert.equal((await server.listActivityDrafts()).length, 0, "Changing steps alone must not leave a pending draft");

  const changed = await server.saveActivityDraft(edit.id, "admin-a", { ...edit.payload, nombre: "Pilates actualizado" }, unchanged.updatedAt.toISOString(), 2);
  assert.equal(changed.hasChanges, true);
  assert.equal((await server.listActivityDrafts()).length, 1);
  assert.equal(activity.nombre, "Pilates", "Autosave must leave the published activity untouched");
  assert.equal("__draft" in changed.payload, false, "Private metadata must not be returned as editable form data");
  await assert.rejects(server.saveActivityDraft(edit.id, "admin-b", edit.payload, unchanged.updatedAt.toISOString(), 4), /otra sesión/);
  await assert.rejects(server.deleteActivityDraft(edit.id, unchanged.updatedAt.toISOString()), /otra sesión/);
  assert.equal((await server.getActivityDraft(edit.id))?.payload.nombre, "Pilates actualizado");

  const simultaneous = await Promise.allSettled([
    server.saveActivityDraft(edit.id, "admin-a", { ...changed.payload, nombre: "Sesión A" }, changed.updatedAt.toISOString()),
    server.saveActivityDraft(edit.id, "admin-b", { ...changed.payload, nombre: "Sesión B" }, changed.updatedAt.toISOString()),
  ]);
  assert.equal(simultaneous.filter((result) => result.status === "fulfilled").length, 1, "Exactly one concurrent write may succeed");
  const latest = (await server.getActivityDraft(edit.id))!;
  const reverted = await server.saveActivityDraft(edit.id, "admin-a", edit.payload, latest.updatedAt.toISOString());
  assert.equal(reverted.hasChanges, false);
  assert.equal((await server.listActivityDrafts()).length, 0, "Reverting all changes hides the pending draft");

  const incomplete = await server.saveActivityDraft(edit.id, "admin-a", { ...reverted.payload, nombre: "Edición incompleta" }, reverted.updatedAt.toISOString());
  const rejectedPublications = await Promise.allSettled([
    server.publishActivityDraft(edit.id, "admin-a", incomplete.updatedAt.toISOString()),
    server.publishActivityDraft(edit.id, "admin-b", incomplete.updatedAt.toISOString()),
  ]);
  assert.ok(rejectedPublications.every((result) => result.status === "rejected"));
  assert.equal(rows.get(edit.id).estado, "INCOMPLETO", "A failed publication must release its lock");
  assert.equal(rows.get(edit.id).updatedAt.getTime(), incomplete.updatedAt.getTime(), "A failed publication must remain retryable");
  const restored = await server.saveActivityDraft(edit.id, "admin-a", edit.payload, incomplete.updatedAt.toISOString());
  await server.publishActivityDraft(edit.id, "admin-a", restored.updatedAt.toISOString());
  assert.equal(await server.getActivityDraft(edit.id), null, "A no-op publication closes only the draft");

  activity = { ...activity, nombre: "Pilates vigente", updatedAt: new Date("2026-01-02T00:00:00.000Z") };
  const refreshed = await server.createActivityEditDraft(activity.id, "admin-a");
  assert.equal(refreshed.payload.nombre, "Pilates vigente", "Unused copies must refresh from the current activity");
  const pending = await server.saveActivityDraft(edit.id, "admin-a", { ...refreshed.payload, nombre: "Mi propuesta" }, refreshed.updatedAt.toISOString());
  activity = { ...activity, updatedAt: new Date("2026-01-03T00:00:00.000Z") };
  await assert.rejects(server.publishActivityDraft(edit.id, "admin-a", pending.updatedAt.toISOString()), /actividad publicada cambió/);
  assert.equal((await server.getActivityDraft(edit.id))?.payload.nombre, "Mi propuesta");

  await server.deleteActivityDraft(edit.id, pending.updatedAt.toISOString());
  assert.equal(await server.getActivityDraft(edit.id), null);
  assert.equal(operationalWrites, 0, "Draft operations must not regenerate classes, reservations, or assignments");
  console.log("OK: drafts, no-op edits, reversion, concurrent saves/deletes, failed publication and published-activity protection.");
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });
