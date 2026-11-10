import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { activityConfigurations } from "../src/features/activity-configuration/services/activity-configuration.server";
import { configurationDates } from "../src/features/activity-configuration/helpers/activity-configuration";

async function main() {
  const hash = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  assert.equal(hash(".env"), hash(".tmp/qa-postgres/original.env.private"));
  const url = new URL(process.env.DIRECT_URL!);
  const project = url.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? decodeURIComponent(url.username).split(".")[1];
  assert.equal(project, "ajgshwyoayitdiktyfyb");
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const results: { id: string; status: string; detail?: unknown }[] = [];
  try {
    const reference = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      return { admin: await tx.usuario.findUniqueOrThrow({ where: { userId: process.env.ADMIN_USERID! }, select: { id: true } }), activities: await tx.actividad.count() };
    });
    const login = await fetch("http://localhost:3000/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: process.env.ADMIN_USERID, password: process.env.ADMIN_PASSWORD }), signal: AbortSignal.timeout(120000) });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const headers = { Authorization: `Bearer ${token}` };
    const get = async (route: string) => { const r = await fetch(`http://localhost:3000${route}`, { headers, signal: AbortSignal.timeout(120000) }); assert.equal(r.status, 200, route); return r.json(); };
    const originalUser = (await get("/api/auth/me")).user;
    assert.equal(originalUser.id, reference.admin.id);
    results.push({ id: "ORIGINAL-DATABASE-IDENTITY", status: "PASS" });
    assert.equal((await get("/api/actividades")).data.length, reference.activities);
    results.push({ id: "ORIGINAL-CATALOG", status: "PASS", detail: { count: reference.activities } });
    if (process.env.QA_VERIFY_CITIZEN_CATALOG === "1") {
      const proof = JSON.parse(fs.readFileSync(`${process.env.QA_EVIDENCE_DIR}/readonly-regression.json`, "utf8"));
      assert.equal(proof.status, "PASS");
      assert.equal(proof.sourceDigest, hash("src/features/citizen/services/citizen.server.ts"), "Catalog code changed after read-only regression; refusing original GET.");
      assert.equal(proof.writes, 0);
      assert.equal(proof.rowLocks, 0);
      const catalog = (await get("/api/citizen/activities")).data;
      results.push({ id: "ORIGINAL-CITIZEN-CATALOG-READONLY", status: "PASS", detail: { count: catalog.length, names: catalog.map((a: { name: string }) => a.name), authenticatedAs: "original administrator; existing endpoint permission unchanged" } });
    }
    await get("/api/dashboard/summary");
    results.push({ id: "ORIGINAL-ADMIN-DASHBOARD", status: "PASS" });
    if (!originalUser.permisos?.some((p: { modulo: string; accion: string }) => p.modulo === "access" && p.accion === "ver")) {
      const denied = await fetch("http://localhost:3000/api/access?view=options", { headers, signal: AbortSignal.timeout(120000) });
      assert.equal(denied.status, 403);
      results.push({ id: "ORIGINAL-RECEPTION-PERMISSION-ENFORCED", status: "PASS", detail: "Original admin has no access:ver; endpoint correctly returns 403." });
      results.push({ id: "ORIGINAL-RECEPTION-DASHBOARD", status: "BLOCKED", detail: "An authorized original reception account is required. No roles or credentials were changed; no generation endpoint called." });
    } else {
    const venues = (await get("/api/access?view=options")).data;
    await get("/api/access?page=1&pageSize=1");
    results.push({ id: "ORIGINAL-RECEPTION-OPTIONS-HISTORY", status: "PASS" });
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
    for (const venue of venues) {
      // GET home can materialize classes. Call it only when the original code's
      // entire generation loop is provably skipped, regardless of existing rows.
      const canReadWithoutGeneration = await db.$transaction(async tx => {
        await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
        const candidates = await tx.horarioActividad.findMany({ where: { establecimientoId: venue.id, estado: "ACTIVO", actividad: { estado: { in: ["ACTIVA", "SIN_CUPO", "COMPLETA"] }, modalidadOperacion: { not: "ACCESO_LIBRE" } } }, select: { actividadId: true } });
        const configurations = await activityConfigurations(tx, candidates.map(s => s.actividadId));
        return candidates.every(s => {
          const validity = configurationDates(configurations.get(s.actividadId) ?? null);
          return !validity.vigenciaConfirmada || !!validity.fechaInicio && validity.fechaInicio.toISOString().slice(0, 10) > today || !!validity.fechaFin && validity.fechaFin.toISOString().slice(0, 10) < today;
        });
      });
      if (!canReadWithoutGeneration) {
        results.push({ id: `ORIGINAL-RECEPTION-HOME-${venue.id}`, status: "BLOCKED", detail: "GET can generate classes; not called against Supabase to preserve read-only restriction." }); continue;
      }
      await get(`/api/access?view=home&establishmentId=${encodeURIComponent(venue.id)}`);
      results.push({ id: `ORIGINAL-RECEPTION-HOME-${venue.id}`, status: "PASS", detail: "Read-only preflight proves generation loop is skipped." });
    }
    }
    for (const route of ["/activities", "/", "/reception"]) { const r = await fetch(`http://localhost:3000${route}`, { signal: AbortSignal.timeout(120000) }); assert.equal(r.status, 200); }
    results.push({ id: "ORIGINAL-UI-ROUTES", status: "PASS", detail: "HTTP page loading; authenticated data verified through real APIs without browser notification side effects." });
  } finally {
    fs.writeFileSync(`${process.env.QA_EVIDENCE_DIR ?? "audit-evidence/qa-stage3"}/original-restored.json`, JSON.stringify({ project, port: 3000, originalEnvUnchanged: hash(".env") === hash(".tmp/qa-postgres/original.env.private"), checkedAt: new Date().toISOString(), results, writesPerformed: false }, null, 2));
    await db.$disconnect();
  }
  console.log(JSON.stringify(results));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
