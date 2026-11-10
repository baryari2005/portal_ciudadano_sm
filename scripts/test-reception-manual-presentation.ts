/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated adapters; never opens a database connection. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInThisContext } from "node:vm";
import ts from "typescript";

function load(file: string, overrides: Record<string, unknown>, extra = "") {
  const path = resolve(file), localRequire = createRequire(path), exports: any = {};
  const code = ts.transpileModule(readFileSync(path, "utf8") + extra, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInThisContext(`(function(exports,require){${code}\n})`, { filename: path })(exports, (name: string) => name in overrides ? overrides[name] : localRequire(name));
  return exports;
}
async function main() {
  const user = { id: "person", nombre: "Ana", apellido: "Prueba", documento: "12345678", email: "ana@example.invalid", estado: "ACTIVO", deletedAt: null, fotoPerfilUrl: "/fixture-photo.png", avatarUrl: "/fixture-avatar.png" };
  let query: any;
  const db = {
    establecimiento: { findFirst: async () => ({ id: "venue", nombre: "Sede" }) },
    usuario: {
      count: async () => 1,
      findMany: async (input: any) => { query = input; return [user]; },
      findUnique: async () => ({ estadoParticipacion: "HABILITADO" }),
    },
    claseActividad: { findMany: async () => [] },
    $transaction: async (reads: Promise<unknown>[]) => Promise.all(reads),
  };
  const server = load("src/features/access/services/access.server.ts", {
    "@/lib/db": { prisma: db },
    "@/features/activity-sessions/services/activity-sessions.server": { ensureActivitySessions: async () => ({ createdCount: 0 }) },
    "@/features/audit-log/services/audit-log.server": {},
    "./digital-access-qr.server": {},
  }, "\nexport { person as mapQrPersonForTest };\n");
  for (const term of ["Ana", "12345678", "ana@example.invalid"]) {
    const found = await server.searchAccessUsers(term, "venue");
    assert.equal(found.items.length, 1);
    assert.equal(query.select.fotoPerfilUrl, true);
    assert.equal(query.select.avatarUrl, true);
    assert.ok(query.where.OR.some((clause: any) => clause.nombre?.contains === term));
    assert.ok(query.where.OR.some((clause: any) => clause.documento?.contains === term));
    assert.ok(query.where.OR.some((clause: any) => clause.email?.contains === term));
    const { validation, ...identity } = found.items[0];
    assert.deepEqual(identity, server.mapQrPersonForTest(user), "Manual and QR share the same identity/photo mapping");
    assert.equal(identity.profilePhotoUrl, user.fotoPerfilUrl);
    assert.equal(identity.avatarUrl, user.avatarUrl);
    assert.equal(validation.reason, "SIN_INSCRIPCION", "Read/presentation does not authorize a person");
  }
  const calls: any[] = [];
  const client = load("src/features/access/services/access.service.ts", {
    "@/lib/axios": { axiosInstance: {
      get: async (url: string, config: unknown) => { calls.push({ url, config }); return { data: { data: [user] } }; },
      post: async (url: string, body: unknown) => { calls.push({ url, body }); return { data: { data: { result: "PERMITIDO" } } }; },
    } },
  });
  await client.searchAccessPeople("venue", "Ana");
  assert.deepEqual(calls[0], { url: "/access/manual/search", config: { params: { establishmentId: "venue", q: "Ana", page: 1, pageSize: 8 } } });
  for (const decision of ["ALLOW", "REJECT"]) {
    const body = { establishmentId: "venue", userId: "person", decision, observation: "Prueba aislada" };
    await client.registerManualAccess(body);
    assert.deepEqual(calls.at(-1), { url: "/access/manual/register", body });
  }
  await client.validateAccessQr("venue", "fixture-token");
  assert.deepEqual(calls.at(-1), { url: "/access/qr/validate", body: { establishmentId: "venue", qrToken: "fixture-token" } });
  console.log("OK: isolated name/DNI/email search contracts, identical manual/QR photo mapping, existing allow/reject and QR request contracts; no database/network.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
