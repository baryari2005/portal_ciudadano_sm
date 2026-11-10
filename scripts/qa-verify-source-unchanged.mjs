import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
const backup = JSON.parse(fs.readFileSync("audit-evidence/qa-stage2/backup-verification.json", "utf8"));
const localUrl = new URL(/^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1]);
if (localUrl.hostname !== "127.0.0.1" || !backup.verificationDatabase.startsWith("qa_restore_")) throw new Error("Local verification destination mismatch.");
localUrl.pathname = `/${backup.verificationDatabase}`;
const source = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL }), restored = new PrismaClient({ datasourceUrl: localUrl.toString() });
const sql = backup.comparisons.map(({ table }) => {
  const coords = table === "Usuario" ? ["domicilioLat", "domicilioLng"] : table === "Establecimiento" ? ["direccionLat", "direccionLng"] : [];
  const json = coords.length ? `((to_jsonb(t)${coords.map(c => `-'${c}'`).join("")}) || jsonb_build_object(${coords.map(c => `'${c}',encode(float8send("${c}"::double precision),'hex')`).join(",")}))` : "to_jsonb(t)";
  return `SELECT '${table}' AS table_name, count(*)::text AS count, md5(coalesce(string_agg(row_hash,'' ORDER BY row_hash COLLATE "C"),'')) AS digest FROM (SELECT md5(${json}::text) AS row_hash FROM public."${table}" t) rows`;
}).join(" UNION ALL ");
const read = db => db.$transaction(async tx => { await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY"); await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'UTC'"); return tx.$queryRawUnsafe(sql); }, { isolationLevel: "RepeatableRead", timeout: 60000 });
try {
  const [a, b] = await Promise.all([read(source), read(restored)]);
  const comparisons = a.map(row => { const old = b.find(item => item.table_name === row.table_name); return { table: row.table_name, sameRowCount: row.count === old?.count, sameContentDigest: row.digest === old?.digest }; });
  const result = { source: backup.project, comparedWithVerifiedPreQaBackup: true, all43PublicTablesUnchanged: comparisons.length === 43 && comparisons.every(row => row.sameRowCount && row.sameContentDigest), comparisons, checkedAt: new Date().toISOString(), operationsReadOnly: true };
  fs.writeFileSync("audit-evidence/qa-stage2/source-unchanged.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ all43PublicTablesUnchanged: result.all43PublicTablesUnchanged, differentTables: comparisons.filter(row => !row.sameRowCount || !row.sameContentDigest).map(row => row.table) }));
} finally { await source.$disconnect(); await restored.$disconnect(); }
