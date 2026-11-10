import fs from "node:fs";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";
const { db, call, calls, users } = await realQaClient();
const results = [];
async function test(id, action) { try { results.push({ id, status: "PASS", detail: await action() }); } catch (e) { results.push({ id, status: "FAIL", detail: e.message }); } fs.writeFileSync(`${process.env.QA_EVIDENCE_DIR ?? "audit-evidence/qa-stage2"}/real-follow-up.json`, JSON.stringify({ results, calls }, null, 2)); console.log(`${id}: ${results.at(-1).status}`); }
try {
  await test("DRAFT-CONCURRENT-AUTOSAVE-RETEST", async () => {
    const draft = (await call("/api/activity-drafts", { method: "POST", body: {}, status: 201 })).data;
    await call(`/api/activity-drafts/${draft.id}`); // Warm route before concurrent requests in next dev.
    const replies = await Promise.all(["A", "B"].map(name => call(`/api/activity-drafts/${draft.id}`, { method: "PATCH", status: [200, 409], body: { expectedUpdatedAt: draft.updatedAt, payload: { ...draft.payload, nombre: `QA_TEST_concurrent_${name}_${Date.now()}` } } })));
    assert.equal(replies.filter(r => r.data).length, 1);
    return "Real endpoints: one 200 and one 409; exactly one version persisted.";
  });
  for (const role of ["reception", "teacher", "citizen"]) for (const method of ["GET", "PATCH"]) await test(`ACCESS-REVIEW-${role}-${method}-DENIED-RETEST`, async () => {
    await call(`/api/users/${users.citizen.id}/access-request`, { role, method, body: method === "PATCH" ? { decision: "APPROVE" } : undefined, status: 403 });
    return "403 JSON; no review or data mutation.";
  });
  await test("ACCESS-REVIEW-ANONYMOUS-DENIED", async () => {
    for (const method of ["GET", "PATCH"]) {
      const r = await fetch(`http://localhost:3000/api/users/${users.citizen.id}/access-request`, { method, ...(method === "PATCH" ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision: "APPROVE" }) } : {}) });
      assert.equal(r.status, 401); assert.equal((await r.json()).message, "No autorizado");
    }
    return "Unauthenticated GET/PATCH return 401 instead of 500.";
  });
} finally { await db.$disconnect(); }
