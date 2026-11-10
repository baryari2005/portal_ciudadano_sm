import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const connection = process.env.DIRECT_URL;
if (!connection) throw new Error("DIRECT_URL required.");
const url = new URL(connection);
const project = url.hostname.match(/^db\.([^.]+)\.supabase\.co$/)?.[1] ?? decodeURIComponent(url.username).split(".")[1];
const db = new PrismaClient({ datasourceUrl: connection });
try {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    return {
      projectRef: project,
      publicProjectMatches: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname === `${project}.supabase.co`,
      database: await tx.$queryRaw`SELECT current_database() AS name, current_setting('transaction_read_only') AS read_only`,
      users: await tx.usuario.count(),
      usersWithPersonalIdentifiers: await tx.usuario.count({ where: { OR: [{ documento: { not: null } }, { cuil: { not: null } }, { celular: { not: null } }, { domicilio: { not: null } }] } }),
      activeAdministrators: await tx.usuario.count({ where: { deletedAt: null, estado: "ACTIVO", rol: { codigo: "admin" } } }),
      existingActivities: await tx.actividad.count(),
      enrollments: await tx.inscripcion.count(),
      accessRecords: await tx.registroAcceso.count(),
      tableCounts: await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
      foreignKeysOutsidePublic: await tx.$queryRaw`SELECT DISTINCT ccu.table_schema AS referenced_schema FROM information_schema.table_constraints tc JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.constraint_schema=ccu.constraint_schema WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema='public' AND ccu.table_schema<>'public'`,
    };
  }, { timeout: 60000 });
  fs.writeFileSync("audit-evidence/qa-stage2/write-safety-readonly.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await db.$disconnect(); }
