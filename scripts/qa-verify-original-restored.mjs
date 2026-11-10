import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const hash = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const connection = new URL(process.env.DIRECT_URL);
const project = connection.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? decodeURIComponent(connection.username).split(".")[1];
assert.equal(project, "ajgshwyoayitdiktyfyb");
assert.equal(hash(".env"), hash(".tmp/qa-postgres/original.env.private"));
const db = new PrismaClient({ datasourceUrl: connection.toString() });
try {
  const reference = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return { admin: await tx.usuario.findUniqueOrThrow({ where: { userId: process.env.ADMIN_USERID }, select: { id: true } }), activities: await tx.actividad.count() };
  });
  const login = await fetch("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: process.env.ADMIN_USERID, password: process.env.ADMIN_PASSWORD }), signal: AbortSignal.timeout(120000) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  const me = await fetch("http://localhost:3000/api/auth/me", { headers });
  assert.equal(me.status, 200); assert.equal((await me.json()).user.id, reference.admin.id);
  const activities = await fetch("http://localhost:3000/api/actividades", { headers });
  assert.equal(activities.status, 200); assert.equal((await activities.json()).data.length, reference.activities);
  const data = { restored: true, project, port: 3000, mode: "original next dev", originalEnvUnchanged: true, authenticatedUserMatchesOriginalDatabase: true, activitiesStatus: activities.status, originalActivityCount: reference.activities, productionDataWrites: false, verifiedAt: new Date().toISOString() };
  fs.writeFileSync("audit-evidence/qa-stage2/original-restored.json", JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data));
} finally { await db.$disconnect(); }
