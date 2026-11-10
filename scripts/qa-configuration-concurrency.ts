import fs from "node:fs";
import assert from "node:assert/strict";
import { PrismaClient, type Prisma } from "@prisma/client";
import { realQaClient } from "./qa-real-client.mjs";
import { writeActivityConfiguration } from "../src/features/activity-configuration/services/activity-configuration.server";

async function main() {
  const { db, call } = await realQaClient() as { db: PrismaClient; call: (route: string, options?: Record<string, unknown>) => Promise<any> };
  const stage3 = process.env.QA_STAGE3_FIXTURES;
  const fixtures = stage3 ? JSON.parse(fs.readFileSync(stage3, "utf8")).fixtures : JSON.parse(fs.readFileSync(".tmp/qa-postgres/fixtures.json", "utf8"));
  const activityId = fixtures.activities.find((item: { label: string }) => item.label === (stage3 ? "capacity" : "5-years")).id;
  const draft = (await call("/api/activity-drafts", { method: "POST", body: { activityId }, status: 201 })).data;
  const description = `QA_TEST_concurrent_autosave_${Date.now()}`;
  let interleaved = false, conflict = false;
  try {
    try {
      await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Actividad" WHERE id=${activityId} FOR UPDATE`;
        // All reads and writes hit real PostgreSQL. Only timing is coordinated:
        // autosave commits after the configuration writer reads its JSON snapshot.
        const delegate = new Proxy(tx.actividadBorrador, { get(target, key) {
          if (key !== "findUnique") return Reflect.get(target, key);
          return async (args: Prisma.ActividadBorradorFindUniqueArgs) => {
            const row = await target.findUnique(args);
            if (!interleaved) {
              interleaved = true;
              await call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", body: { expectedUpdatedAt: draft.updatedAt, payload: { ...draft.payload, descripcion: description } } });
            }
            return row;
          };
        } });
        await writeActivityConfiguration({ actividadBorrador: delegate, horarioActividad: tx.horarioActividad, $queryRaw: tx.$queryRaw.bind(tx) }, activityId, { endDate: "2031-11-01" });
      }, { timeout: 60000 });
    } catch (error) {
      if (error instanceof Error && error.name === "CatalogConflictError") conflict = true;
      else throw error;
    }
    const stored = (await call(`/api/activity-drafts/${draft.id}`)).data;
    const preserved = stored.payload.descripcion === description;
    fs.writeFileSync(`audit-evidence/${stage3 ? "qa-stage3" : "qa-stage2"}/configuration-concurrency-${preserved ? "after" : "before"}.json`, JSON.stringify({ activityId, realPostgreSQL: true, realAutosaveEndpoint: true, apiInterception: false, interleaved, conflict, autosavePreserved: preserved, status: preserved && conflict ? "PASS" : "FAIL" }, null, 2));
    assert.ok(preserved, "Published configuration overwrote a newer real autosave payload.");
    assert.ok(conflict, "Concurrent configuration should report an explicit conflict.");
    console.log("PASS: real PostgreSQL configuration/autosave concurrency preserves the newer payload.");
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
