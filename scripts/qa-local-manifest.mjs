import fs from "node:fs";
import { PrismaClient, Prisma } from "@prisma/client";
const url = new URL(/^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1]);
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/mas_sanmiguel_qa") throw new Error("Local manifest guard failed.");
const db = new PrismaClient({ datasourceUrl: url.toString() });
try {
  const models = Prisma.dmmf.datamodel.models;
  const tables = [];
  for (const model of models) {
    const table = model.dbName ?? model.name;
    const keys = model.primaryKey?.fields ?? model.fields.filter(f => f.isId).map(f => f.name);
    const scalarLabels = ["nombre", "userId", "estado"].filter(name => model.fields.some(f => f.name === name && f.kind !== "object"));
    const columns = [...new Set([...keys, ...scalarLabels])].map(name => model.fields.find(f => f.name === name)?.dbName ?? name);
    const [{ count }] = await db.$queryRawUnsafe(`SELECT count(*)::int AS count FROM public."${table}"`);
    const records = columns.length ? await db.$queryRawUnsafe(`SELECT ${columns.map(c => `"${c}"`).join(",")} FROM public."${table}"`) : [];
    tables.push({ table, count, records });
  }
  fs.writeFileSync("audit-evidence/qa-stage2/test-data-manifest.json", JSON.stringify({ database: "mas_sanmiguel_qa", localOnly: true, remoteTestRecordsCreated: 0, automaticCleanup: false, tables }, null, 2));
  console.log(JSON.stringify(tables.filter(t => t.count).map(({ table, count }) => ({ table, count }))));
} finally { await db.$disconnect(); }
