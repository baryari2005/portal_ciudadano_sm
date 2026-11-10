import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { assertLocalQaUrl } from "./qa-real-client.mjs";
const snapshot = ".tmp/qa-postgres/citizen-catalog-source.private.json";
const delegates = ["actividad", "actividadBorrador", "horarioActividad", "horarioActividadProfesor", "claseActividad", "claseActividadProfesor", "establecimiento", "profesor", "publicoObjetivo", "actividadPublicoObjetivo"];
if (process.argv[2] === "capture") {
  const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  try {
    const data = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
      const values = {};
      for (const model of delegates) values[model] = model === "profesor" ? await tx.profesor.findMany({ select: { id: true, estado: true } }) : await tx[model].findMany();
      return values;
    }, { timeout: 60000, isolationLevel: "RepeatableRead" });
    fs.writeFileSync(snapshot, JSON.stringify(data));
    console.log(JSON.stringify({ readOnly: true, counts: Object.fromEntries(delegates.map(d => [d, data[d].length])) }));
  } finally { await db.$disconnect(); }
} else if (process.argv[2] === "seed") {
  const url = assertLocalQaUrl(/^DATABASE_URL="([^"]+)"/m.exec(fs.readFileSync(".tmp/qa-postgres/connection.env", "utf8"))[1]);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const source = JSON.parse(fs.readFileSync(snapshot, "utf8"));
  const marker = `QA_TEST_CATALOG_${Date.now()}`, ids = new Map(), manifest = { marker, activities: [], venues: [] };
  for (const model of delegates) for (const row of source[model]) if (row.id) ids.set(row.id, randomUUID());
  const remap = value => typeof value === "string" ? ids.get(value) ?? value : Array.isArray(value) ? value.map(remap) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v)])) : value;
  try {
    const admin = await db.usuario.findUniqueOrThrow({ where: { userId: "QA_TEST_admin" } });
    const teacherRole = await db.rol.findUniqueOrThrow({ where: { codigo: "teacher" } });
    const category = await db.categoriaActividad.findFirstOrThrow();
    await db.$transaction(async tx => {
      for (const [i, p] of source.profesor.entries()) {
        const u = await tx.usuario.create({ data: { userId: `${marker}_p${i}`, email: `${marker.toLowerCase()}_p${i}@example.invalid`, nombre: "QA_TEST", apellido: `Profesor ${i}`, password: admin.password, rolId: teacherRole.id, estado: "ACTIVO" } });
        await tx.profesor.create({ data: { id: ids.get(p.id), usuarioId: u.id, estado: p.estado } });
      }
      for (const [i, v] of source.establecimiento.entries()) { await tx.establecimiento.create({ data: { id: ids.get(v.id), nombre: `${marker}_sede_${i}`, direccion: "QA_TEST", activo: v.activo, estado: v.estado } }); manifest.venues.push(ids.get(v.id)); }
      for (const p of source.publicoObjetivo) await tx.publicoObjetivo.create({ data: { ...remap(p), nombre: `${marker}_${p.nombre}`, slug: `${marker.toLowerCase()}-${p.slug}` } });
      for (const a of source.actividad) {
        await tx.actividad.create({ data: { ...remap(a), nombre: `${marker}_${a.nombre}`, descripcion: "QA_TEST reproducción aislada", descripcionCorta: "QA_TEST", responsableId: null, responsableNombre: null, imagenUrl: "http://localhost:3000/useradmin1.png", categoriaActividadId: category.id } });
        manifest.activities.push({ originalId: a.id, id: ids.get(a.id), name: a.nombre });
      }
      for (const h of source.horarioActividad) await tx.horarioActividad.create({ data: { ...remap(h), observaciones: "QA_TEST" } });
      for (const p of source.horarioActividadProfesor) await tx.horarioActividadProfesor.create({ data: remap(p) });
      for (const p of source.actividadPublicoObjetivo) await tx.actividadPublicoObjetivo.create({ data: remap(p) });
      for (const c of source.claseActividad) await tx.claseActividad.create({ data: { ...remap(c), observaciones: "QA_TEST", motivoCancelacion: null, asistenciaCerradaPorId: null } });
      for (const p of source.claseActividadProfesor) await tx.claseActividadProfesor.create({ data: remap(p) });
      for (const d of source.actividadBorrador.filter(d => d.actividadId)) await tx.actividadBorrador.create({ data: { ...remap(d), creadoPorId: admin.id, nombre: `${marker}_${d.nombre}` } });
    }, { timeout: 120000 });
    fs.writeFileSync("audit-evidence/citizen-catalog/source-reproduction.json", JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ localOnly: true, marker, activities: manifest.activities.length }));
  } finally { await db.$disconnect(); }
} else throw new Error("Use capture (read-only source) or seed (guarded local writes).");
