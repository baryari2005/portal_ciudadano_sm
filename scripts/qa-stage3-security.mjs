import fs from "node:fs";
import assert from "node:assert/strict";
import { SignJWT } from "jose";
import { realQaClient } from "./qa-real-client.mjs";
const { db, users, call, calls } = await realQaClient();
const results = [];
async function test(id, fn) { try { await fn(); results.push({ id, status: "PASS" }); } catch (e) { results.push({ id, status: "FAIL", detail: e.message }); } console.log(`${id}: ${results.at(-1).status}`); }
try {
  const before = await db.usuario.count();
  for (const role of ["teacher", "citizen"]) await test(`USER-CREATE-${role}-DENIED`, () => call("/api/users", { role, method: "POST", body: {}, status: 403 }));
  await test("USER-CREATE-ANONYMOUS-DENIED", async () => {
    const r = await fetch("http://localhost:3000/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); assert.equal(r.status, 401);
  });
  await test("USER-CREATE-ADMIN-VALIDATION", () => call("/api/users", { method: "POST", body: {}, status: 400 }));
  await test("EXPIRED-SIGNED-SESSION-DENIED", async () => {
    const token = await new SignJWT({ uid: users.citizen.id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt(Math.floor(Date.now() / 1000) - 120).setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me"));
    for (const route of ["/api/citizen/profile", "/api/dashboard/summary"]) {
      const r = await fetch(`http://localhost:3000${route}`, { headers: { Authorization: `Bearer ${token}` } }); assert.equal(r.status, 401);
    }
  });
  await test("DENIED-USER-OPERATIONS-NO-WRITES", async () => assert.equal(await db.usuario.count(), before));
} finally {
  fs.writeFileSync("audit-evidence/qa-stage3/security-final.json", JSON.stringify({ results, calls, database: "independent local QA", apiInterception: false }, null, 2));
  await db.$disconnect();
}
