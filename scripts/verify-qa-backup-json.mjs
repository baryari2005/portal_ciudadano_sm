import fs from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const file = "audit-evidence/qa-stage2/backup-verification.json";
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const connection = /^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1];
const url = new URL(connection);
if (url.hostname !== "127.0.0.1" || !manifest.verificationDatabase.startsWith("qa_restore_")) throw new Error("Local restore guard failed.");
url.pathname = `/${manifest.verificationDatabase}`;
const source = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const restored = new PrismaClient({ datasourceUrl: url.toString() });
function canonical(value) { if (Array.isArray(value)) return value.map(canonical); if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])); return value; }
function digest(rows) { return createHash("sha256").update(JSON.stringify(rows.map(row => canonical(row.value)).map(row => JSON.stringify(row)).sort())).digest("hex"); }
try {
  for (const row of manifest.comparisons.filter(item => !item.digestMatches)) {
    const table = row.table.replaceAll('"', '""');
    const read = db => db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'");
      return tx.$queryRawUnsafe(`SELECT to_jsonb(t) AS value FROM public."${table}" t`);
    }, { timeout: 60000 });
    const [a, b] = await Promise.all([read(source), read(restored)]);
    row.canonicalJsonVerified = a.length === b.length && digest(a) === digest(b);
    const restoredById = new Map(b.map(item => [String(item.value.id), item.value]));
    row.differentColumns = [...new Set(a.flatMap(item => {
      const other = restoredById.get(String(item.value.id));
      return Object.keys(item.value).filter(key => JSON.stringify(canonical(item.value[key])) !== JSON.stringify(canonical(other?.[key])));
    }))];
    const coordinateColumns = ["direccionLat", "direccionLng", "domicilioLat", "domicilioLng"];
    if (row.differentColumns.length && row.differentColumns.every(key => coordinateColumns.includes(key))) {
      const columns = row.differentColumns;
      const floats = db => db.$queryRawUnsafe(`SELECT id::text AS id, ${columns.map(key => `encode(float8send("${key}"::double precision), 'hex') AS "${key}"`).join(",")} FROM public."${table}" ORDER BY id::text COLLATE "C"`);
      const [left, right] = await Promise.all([floats(source), floats(restored)]);
      const withoutCoordinates = rows => rows.map(item => ({ value: Object.fromEntries(Object.entries(item.value).filter(([key]) => !columns.includes(key))) }));
      row.binaryFloatVerified = JSON.stringify(left) === JSON.stringify(right);
      row.otherColumnsVerified = digest(withoutCoordinates(a)) === digest(withoutCoordinates(b));
    }
    row.canonicalVerificationAt = new Date().toISOString();
  }
  manifest.verified = manifest.comparisons.every(row => row.rowsMatch && (row.digestMatches || row.canonicalJsonVerified || (row.binaryFloatVerified && row.otherColumnsVerified)));
  manifest.canonicalComparisonNote = "Fallback compares decoded JSON values read from source and local restore; the original SQL text digests remain recorded, including version/float formatting differences.";
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ verified: manifest.verified, fallback: manifest.comparisons.filter(row => !row.digestMatches).map(row => ({ table: row.table, canonicalJsonVerified: row.canonicalJsonVerified, differentColumns: row.differentColumns })) }));
} finally { await source.$disconnect(); await restored.$disconnect(); }
