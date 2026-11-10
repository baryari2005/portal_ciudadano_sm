import fs from "node:fs";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

export function assertLocalQaUrl(connection) {
  const url = new URL(connection);
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55432"); assert.equal(url.pathname, "/mas_sanmiguel_qa");
  return url;
}

export async function realQaClient() {
  const url = assertLocalQaUrl(/^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1]);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const accounts = JSON.parse(fs.readFileSync(".tmp/qa-postgres/accounts.private.json", "utf8"));
  const tokens = {}, users = {}, calls = [];
  let enabled = false;
  async function call(route, { role = "admin", method = "GET", body, status = 200 } = {}) {
    if (!enabled && route !== "/api/auth/login" && route !== "/api/auth/me") throw new Error("Local identity must be verified first.");
    const response = await fetch("http://localhost:3000" + route, { method, headers: { ...(tokens[role] ? { Authorization: `Bearer ${tokens[role]}` } : {}), ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(120000) });
    let data; const text = await response.text(); try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 100) }; }
    calls.push({ route, role, method, status: response.status });
    assert.ok((Array.isArray(status) ? status : [status]).includes(response.status), `${method} ${route}: ${response.status} ${JSON.stringify(data).slice(0, 500)}`);
    return data;
  }
  for (const account of accounts) {
    const result = await call("/api/auth/login", { method: "POST", body: { userId: account.userId, password: account.password } });
    tokens[account.role] = result.token;
    users[account.role] = (await call("/api/auth/me", { role: account.role })).user;
    assert.equal(users[account.role].id, (await db.usuario.findUniqueOrThrow({ where: { userId: account.userId } })).id, "Refusing writes: localhost is not the local QA database.");
  }
  enabled = true;
  async function authenticate(role, userId, password) {
    assert.ok(enabled, "Local identity must be verified first.");
    const result = await call("/api/auth/login", { method: "POST", body: { userId, password } });
    tokens[role] = result.token;
    users[role] = (await call("/api/auth/me", { role })).user;
    assert.equal(users[role].id, (await db.usuario.findUniqueOrThrow({ where: { userId } })).id);
    return users[role];
  }
  async function download(route, role = "admin") {
    assert.ok(enabled, "Local identity must be verified first.");
    const response = await fetch("http://localhost:3000" + route, { headers: { Authorization: `Bearer ${tokens[role]}` }, signal: AbortSignal.timeout(120000) });
    calls.push({ route, role, method: "GET", status: response.status });
    return response;
  }
  return { db, users, call, calls, authenticate, download };
}
