import assert from "node:assert/strict";
import {
  actividadSchema,
  updateActividadSchema,
} from "../src/features/actividades/schemas/actividad.schema";

const base = {
  nombre: "Yoga",
  establecimientoId: "legacy-establishment",
  categoriaActividadId: null,
  publicosObjetivoIds: [],
  horarios: [],
  asignados: [],
};

const parses = (changes: Record<string, unknown> = {}) =>
  actividadSchema.safeParse({ ...base, ...changes });

assert.ok(parses().success);
assert.equal(parses().data?.estado, undefined);
assert.ok(parses({ estado: "BORRADOR" }).success);
assert.ok(parses({ estado: "ACTIVA" }).success);
assert.ok(parses({ estado: "SIN_CUPO" }).success);
assert.ok(parses({ estado: "SUSPENDIDA" }).success);
assert.ok(parses({ estado: "FINALIZADA" }).success);
assert.ok(parses({ estado: "CANCELADA" }).success);
assert.ok(!parses({ estado: "PUBLICADA" }).success);
assert.ok(parses({ descripcionCorta: " Breve " }).success);
assert.equal(parses({ descripcionCorta: " Breve " }).data?.descripcionCorta, "Breve");
assert.ok(!parses({ descripcionCorta: "x".repeat(181) }).success);
assert.ok(parses({ edadMinima: 13, edadMaxima: 17 }).success);
assert.ok(!parses({ edadMinima: 18, edadMaxima: 17 }).success);
assert.ok(!parses({ edadMinima: -1 }).success);
assert.ok(!parses({ edadMinima: 1.5 }).success);
assert.ok(parses({ imagenUrl: "https://example.com/yoga.jpg" }).success);
assert.ok(parses({ imagenUrl: "/uploads/actividades/yoga.jpg" }).success);
assert.ok(!parses({ imagenUrl: "javascript:alert(1)" }).success);
assert.equal(parses({ color: "#1d4f36" }).data?.color, "#1D4F36");
assert.ok(!parses({ color: "green" }).success);
assert.ok(parses({ esGratuita: true, precio: "100" }).success);
assert.ok(parses({ esGratuita: false, precio: "15000.00" }).success);
assert.ok(!parses({ esGratuita: false, precio: null }).success);
assert.ok(!parses({ esGratuita: false, precio: "0" }).success);
assert.ok(!parses({ esGratuita: false, precio: "10.999" }).success);
assert.ok(!parses({ publicosObjetivoIds: [crypto.randomUUID(), crypto.randomUUID()] }).success === false);
const duplicateId = crypto.randomUUID();
assert.ok(!parses({ publicosObjetivoIds: [duplicateId, duplicateId] }).success);
assert.ok(!updateActividadSchema.safeParse({}).success);
assert.ok(updateActividadSchema.safeParse({ publicosObjetivoIds: [] }).success);

console.log("OK: validaciones del contrato general de Actividad superadas.");
