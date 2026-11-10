import assert from "node:assert/strict";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { assertLocalQaUrl } from "./qa-real-client.mjs";

async function main() {
  const connection = /^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))![1];
  assertLocalQaUrl(connection);
  Object.assign(process.env, { DATABASE_URL: connection, DIRECT_URL: connection, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:1", NEXT_PUBLIC_SUPABASE_ANON_KEY: "qa-disabled", SUPABASE_SERVICE_ROLE_KEY: "qa-disabled" });
  const db = new PrismaClient({ datasourceUrl: connection, log: [{ emit: "event", level: "query" }] });
  // Observe the actual client used by the service, without replacing its queries.
  (globalThis as typeof globalThis & { prisma: unknown }).prisma = db;
  const user = await db.usuario.findUniqueOrThrow({ where: { userId: "QA_TEST_citizen" } });
  const queries: string[] = [];
  db.$on("query", event => queries.push(event.query));
  try {
    const { listCitizenActivities } = await import("../src/features/citizen/services/citizen.server");
    const start = performance.now();
    const data = await listCitizenActivities(user.id);
    assert.ok(data.length > 0);
    assert.ok(!queries.some(query => /^(BEGIN|INSERT|UPDATE|DELETE)|FOR UPDATE/.test(query)), "Catalog must not create classes, acquire row locks or start materialization transactions.");
    const sourceDigest = createHash("sha256").update(fs.readFileSync("src/features/citizen/services/citizen.server.ts")).digest("hex");
    const result = { status: "PASS", realPostgreSQL: true, mockedQueries: false, sourceDigest, count: data.length, queries: queries.length, elapsedMs: Math.round(performance.now() - start), transactions: 0, rowLocks: 0, writes: 0 };
    fs.writeFileSync(`${process.env.QA_EVIDENCE_DIR ?? "audit-evidence/citizen-catalog"}/readonly-regression.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
