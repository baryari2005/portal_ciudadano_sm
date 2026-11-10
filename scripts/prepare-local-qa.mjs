import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Explicitly local bootstrap. Never reads the application's .env connection.
const root = path.resolve(".tmp/qa-postgres");
const config = fs.readFileSync(path.join(root, "connection.env"), "utf8");
const connection = /^DATABASE_URL="([^"]+)"/m.exec(config)?.[1];
const url = new URL(connection);
if (url.hostname !== "127.0.0.1" || url.port !== "55432" || url.pathname !== "/mas_sanmiguel_qa") {
  throw new Error("Refusing to seed any database except the independent local QA database.");
}
const env = { ...process.env, DATABASE_URL: connection, DIRECT_URL: connection };
const seeded = spawnSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.rols.ts"], { env, encoding: "utf8" });
if (seeded.status !== 0) throw new Error(`Local catalog seed failed (${seeded.status}).`);
const db = new PrismaClient({ datasources: { db: { url: connection } } });
try {
  const identity = await db.$queryRaw`SELECT current_database() AS database, inet_server_port() AS port`;
  if (identity[0]?.database !== "mas_sanmiguel_qa" || identity[0]?.port !== 55432) throw new Error("Local database identity mismatch.");
  const password = randomBytes(24).toString("base64url");
  const hash = await bcrypt.hash(password, 10);
  const accounts = [];
  for (const code of ["admin", "teacher", "reception", "citizen"]) {
    const role = await db.rol.findUniqueOrThrow({ where: { codigo: code } });
    const previousId = code === "admin" ? "admin" : `qa-${code}`;
    const userId = `QA_TEST_${code}`;
    const previous = await db.usuario.findUnique({ where: { userId: previousId } });
    if (previous) await db.usuario.update({ where: { id: previous.id }, data: { userId } });
    const user = await db.usuario.upsert({
      where: { userId },
      create: { userId, email: `${userId}@example.invalid`, password: hash, nombre: "QA_TEST", apellido: code,
        rolId: role.id, estado: "ACTIVO", perfilCompleto: true, documento: String(99000000 + role.id),
        fechaNacimiento: new Date("1990-01-01"), mustChangePassword: false },
      update: { password: hash, email: `${userId}@example.invalid`, nombre: "QA_TEST", apellido: code,
        estado: "ACTIVO", perfilCompleto: true, mustChangePassword: false },
    });
    if (code === "teacher") await db.profesor.upsert({ where: { usuarioId: user.id }, update: {}, create: { usuarioId: user.id, especialidad: "QA local" } });
    accounts.push({ role: code, userId, password });
  }
  await db.establecimiento.upsert({ where: { id: "qa-local-establishment" }, update: { nombre: "QA_TEST Sede ficticia" }, create: {
    id: "qa-local-establishment", nombre: "QA_TEST Sede ficticia", direccion: "Calle de prueba 123", localidad: "San Miguel",
    horarios: { create: ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"].map(diaSemana => ({ diaSemana, horaApertura: "06:00", horaCierre: "23:59" })) },
  } });
  fs.writeFileSync(path.join(root, "accounts.private.json"), JSON.stringify(accounts, null, 2));
  const summary = { database: "mas_sanmiguel_qa", host: "127.0.0.1", port: 55432, roles: await db.rol.count(), users: await db.usuario.count(), permissions: await db.permiso.count(), categories: await db.categoriaActividad.count(), targetAudiences: await db.publicoObjetivo.count(), establishments: await db.establecimiento.count(), productionDataCopied: false };
  fs.mkdirSync("audit-evidence/qa-stage2", { recursive: true });
  fs.writeFileSync("audit-evidence/qa-stage2/local-database.json", JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} finally { await db.$disconnect(); }
