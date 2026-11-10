import fs from "node:fs";
import assert from "node:assert/strict";
import { realQaClient } from "./qa-real-client.mjs";
const { db, call, calls } = await realQaClient();
const previous = process.argv.includes("--retry") ? JSON.parse(fs.readFileSync("audit-evidence/auth-persistence/catalog-regression.json", "utf8")) : null;
const runId = previous?.runId ?? `QA_TEST_${Date.now()}`, results = previous?.results ?? [];
const cases = [
  ["CATEGORY", "/api/categorias-actividades", "categoriaActividad", { nombre: `${runId}_category`, color: "#1D4F36" }],
  ["AUDIENCE", "/api/publicos-objetivo", "publicoObjetivo", { nombre: `${runId}_audience`, edadMinimaSugerida: 18, edadMaximaSugerida: 99 }],
  ["REQUIREMENT", "/api/requirements", "requisito", { nombre: `${runId}_document`, tipo: "DOCUMENTO", requiereDocumento: true, documentoPersonal: true }],
  ["MEDICAL-COVERAGE", "/api/medical-coverages", "coberturaMedica", { nombre: `${runId}_coverage`, tipo: "OBRA_SOCIAL" }],
  ["RESOURCE", "/api/resources", "recurso", { nombre: `${runId}_resource`, codigo: `QA_TEST_${Date.now()}`, establecimientoId: "qa-local-establishment", tipo: "EQUIPAMIENTO", modoReserva: "CAPACIDAD", capacidadUnidades: 5 }],
  ["ESTABLISHMENT", "/api/establecimientos", "establecimiento", { nombre: `${runId}_venue`, direccion: `QA_TEST ${runId} Calle 123`, horarios: [] }],
];
try {
  for (const [id, route, model, body] of cases) {
    const caseId = `CATALOG-${id}-CREATE-EDIT-READ`;
    if (previous && results.some(result => result.id === caseId && result.status === "PASS")) continue;
    const existingIndex = results.findIndex(result => result.id === caseId);
    if (existingIndex !== -1) results.splice(existingIndex, 1);
    try {
      const existing = previous ? await db[model].findFirst({ where: { nombre: { startsWith: body.nombre } } }) : null;
      const created = existing ?? (await call(route, { method: "POST", body, status: 201 })).data;
      assert.ok(created?.id);
      const stored = await db[model].findUniqueOrThrow({ where: { id: created.id } });
      assert.ok(stored.nombre.startsWith(body.nombre));
      const patch = id === "ESTABLISHMENT" ? { ...body, observacion: "QA_TEST edit" } : { descripcion: "QA_TEST edit" };
      // Coverage has no description field; its endpoint accepts the full DTO.
      if (id === "MEDICAL-COVERAGE") Object.assign(patch, body, { nombre: `${body.nombre}_edited` });
      await call(`${route}/${created.id}`, { method: ["ESTABLISHMENT", "ROLE"].includes(id) ? "PUT" : "PATCH", body: patch, status: 200 });
      if (id === "MEDICAL-COVERAGE") {
        assert.ok((await call(route)).data.some(item => item.id === created.id));
      } else await call(`${route}/${created.id}`);
      results.push({ id: `CATALOG-${id}-CREATE-EDIT-READ`, status: "PASS", recordId: created.id, name: body.nombre });
    } catch (error) { results.push({ id: `CATALOG-${id}-CREATE-EDIT-READ`, status: "FAIL", detail: error.message }); }
    fs.writeFileSync("audit-evidence/auth-persistence/catalog-regression.json", JSON.stringify({ runId, results, calls }, null, 2));
    console.log(`${id}: ${results.at(-1).status}`);
  }
} finally { await db.$disconnect(); }
