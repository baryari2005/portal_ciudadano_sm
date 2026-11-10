import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const remote = new URL(process.env.DIRECT_URL);
const expectedProject = "ajgshwyoayitdiktyfyb";
if (!remote.hostname.includes("supabase") || !(remote.hostname.includes(expectedProject) || decodeURIComponent(remote.username).includes(expectedProject))) throw new Error("Unexpected source project.");
const root = path.resolve(".tmp/qa-postgres");
const backupRoot = path.join(root, `backup-${Date.now()}`);
fs.mkdirSync(backupRoot);
const archive = path.join(backupRoot, "public.backup");
const binary = name => path.join(root, "pgsql/bin", `${name}.exe`);
const remoteEnv = { ...process.env, PGHOST: remote.hostname, PGPORT: remote.port || "5432", PGUSER: decodeURIComponent(remote.username), PGPASSWORD: decodeURIComponent(remote.password), PGDATABASE: remote.pathname.slice(1), PGSSLMODE: "require" };
function command(name, args, env) {
  const result = spawnSync(binary(name), args, { env, encoding: "utf8", timeout: 180000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(path.join(backupRoot, `${name}.private.log`), result.stderr || "");
  if (result.status !== 0) throw new Error(`${name} failed; inspect private log (no writes to source).`);
  return result.stdout;
}
const digestSql = table => `SELECT count(*)::text AS count, md5(coalesce(string_agg(row_hash, '' ORDER BY row_hash), '')) AS digest FROM (SELECT md5(to_jsonb(t)::text) AS row_hash FROM public."${table.replaceAll('"', '""')}" t) rows`;
const source = new PrismaClient({ datasourceUrl: remote.toString() });
let expected;
try {
  expected = await source.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
    const tables = await tx.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
    const [{ snapshot }] = await tx.$queryRaw`SELECT pg_export_snapshot() AS snapshot`;
    const rows = [];
    for (const { tablename } of tables) rows.push({ table: tablename, ...(await tx.$queryRawUnsafe(digestSql(tablename)))[0] });
    command("pg_dump", ["--format=custom", "--schema=public", "--no-owner", "--no-privileges", `--snapshot=${snapshot}`, `--file=${archive}`], remoteEnv);
    return rows;
  }, { isolationLevel: "RepeatableRead", timeout: 180000 });
} finally { await source.$disconnect(); }
const localConnection = /^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(path.join(root, "connection.env"), "utf8"))[1];
const local = new URL(localConnection);
if (local.hostname !== "127.0.0.1" || local.port !== "55432") throw new Error("Restore destination must be local QA server.");
const verificationDatabase = `qa_restore_${Date.now()}`;
const localEnv = { ...process.env, PGHOST: "127.0.0.1", PGPORT: "55432", PGUSER: decodeURIComponent(local.username), PGPASSWORD: decodeURIComponent(local.password), PGDATABASE: verificationDatabase, PGSSLMODE: "disable" };
command("createdb", [verificationDatabase], localEnv);
const toc = command("pg_restore", ["--list", archive], localEnv);
const listFile = path.join(backupRoot, "restore.list");
// Fresh PostgreSQL databases already contain public. Exclude only that CREATE,
// leaving all tables, data, constraints and policies in the restore inventory.
fs.writeFileSync(listFile, toc.split("\n").filter(line => !/ SCHEMA - public /.test(line)).join("\n"));
command("pg_restore", ["--exit-on-error", "--no-owner", "--no-privileges", `--use-list=${listFile}`, `--dbname=${verificationDatabase}`, archive], localEnv);
local.pathname = `/${verificationDatabase}`;
const restored = new PrismaClient({ datasourceUrl: local.toString() });
const comparisons = [];
try {
  await restored.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
    for (const row of expected) {
      const actual = (await tx.$queryRawUnsafe(digestSql(row.table)))[0];
      comparisons.push({ table: row.table, count: row.count, rowsMatch: row.count === actual.count, digestMatches: row.digest === actual.digest });
    }
  }, { timeout: 60000 });
} finally { await restored.$disconnect(); }
const manifest = { project: expectedProject, createdAt: new Date().toISOString(), scope: "public schema and data only; excludes Supabase Auth, Storage metadata and stored files", archive: path.relative(process.cwd(), archive), bytes: fs.statSync(archive).size, sha256: createHash("sha256").update(fs.readFileSync(archive)).digest("hex"), verificationDatabase, sourceWrites: false, restoredOnlyLocally: true, comparisons, verified: comparisons.every(row => row.rowsMatch && row.digestMatches) };
fs.writeFileSync("audit-evidence/qa-stage2/backup-verification.json", JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest));
if (!manifest.verified) process.exitCode = 1;
