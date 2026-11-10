import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
const source = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const localUrl = /^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1];
const local = new PrismaClient({ datasourceUrl: localUrl });
const inspect = db => db.$transaction(async tx => {
  await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
  const columns = await tx.$queryRaw`SELECT table_name,column_name,udt_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name<>'_prisma_migrations' ORDER BY table_name,column_name`;
  const constraints = await tx.$queryRaw`SELECT tc.table_name,tc.constraint_type, string_agg(kcu.column_name,',' ORDER BY kcu.ordinal_position) AS columns FROM information_schema.table_constraints tc LEFT JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema WHERE tc.table_schema='public' AND tc.table_name<>'_prisma_migrations' AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE','FOREIGN KEY') GROUP BY tc.table_name,tc.constraint_name,tc.constraint_type ORDER BY tc.table_name,tc.constraint_type,columns`;
  return { columns, constraints };
}, { timeout: 60000 });
try {
  const [a, b] = await Promise.all([inspect(source), inspect(local)]);
  const key = row => JSON.stringify(row);
  const extra = (left, right) => { const known = new Set(right.map(key)); return left.filter(row => !known.has(key(row))); };
  const result = { sourceReadOnly: true, columnsOnlyInSource: extra(a.columns, b.columns), columnsOnlyInLocal: extra(b.columns, a.columns), constraintsOnlyInSource: extra(a.constraints, b.constraints), constraintsOnlyInLocal: extra(b.constraints, a.constraints), exactColumnParity: JSON.stringify(a.columns) === JSON.stringify(b.columns), sourceColumns: a.columns.length, localColumns: b.columns.length };
  fs.writeFileSync("audit-evidence/qa-stage2/schema-parity.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await source.$disconnect(); await local.$disconnect(); }
