import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
const remoteUrl = new URL(process.env.DIRECT_URL);
if (!decodeURIComponent(remoteUrl.username).includes("ajgshwyoayitdiktyfyb") && !remoteUrl.hostname.includes("ajgshwyoayitdiktyfyb")) throw new Error("Unexpected read-only source.");
const localUrl = new URL(/^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1]);
if (localUrl.hostname !== "127.0.0.1" || localUrl.port !== "55432" || localUrl.pathname !== "/mas_sanmiguel_qa") throw new Error("DDL is authorized only on the independent local QA database.");
const source = new PrismaClient({ datasourceUrl: remoteUrl.toString() }), local = new PrismaClient({ datasourceUrl: localUrl.toString() });
const quote = name => `"${name.replaceAll('"', '""')}"`;
try {
  const constraints = await source.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return tx.$queryRaw`SELECT c.conname, r.relname AS table_name, pg_get_constraintdef(c.oid, true) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='f' ORDER BY r.relname,c.conname`;
  });
  let added = 0;
  await local.$transaction(async tx => {
    const existing = await tx.$queryRaw`SELECT c.conname, r.relname AS table_name FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='public' AND c.contype='f'`;
    for (const row of constraints) {
      if (existing.some(item => item.conname === row.conname && item.table_name === row.table_name)) continue;
      if (!row.definition.startsWith("FOREIGN KEY")) throw new Error("Only source foreign-key definitions may be mirrored.");
      await tx.$executeRawUnsafe(`ALTER TABLE public.${quote(row.table_name)} ADD CONSTRAINT ${quote(row.conname)} ${row.definition}`);
      added++;
    }
    await tx.$executeRaw`ALTER TABLE public."PublicoObjetivo" ALTER COLUMN "generosAdmitidos" SET NOT NULL`;
  }, { timeout: 60000 });
  const result = { sourceWrites: false, destination: "127.0.0.1:55432/mas_sanmiguel_qa", localForeignKeysAdded: added, localNotNullMirrored: ["PublicoObjetivo.generosAdmitidos"], migrationCommandsExecuted: false, existingFictionalDataValidatedByConstraints: true };
  fs.writeFileSync("audit-evidence/qa-stage2/local-constraint-parity.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await source.$disconnect(); await local.$disconnect(); }
