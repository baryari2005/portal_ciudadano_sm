import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../src/lib/db";
import {
  actividadSchema,
  updateActividadSchema,
} from "../src/features/actividades/schemas/actividad.schema";
import {
  createActividad,
  deleteActividad,
  getActividad,
  patchActividad,
  updateActividad,
} from "../src/features/actividades/services/actividades.server";

const establishmentId = randomUUID();
const createdIds: string[] = [];
let assertions = 0;

function ok(value: unknown, message?: string) {
  assert.ok(value, message);
  assertions += 1;
}

function equal(actual: unknown, expected: unknown, message?: string) {
  assert.equal(actual, expected, message);
  assertions += 1;
}

const oldContract = {
  nombre: "Actividad de compatibilidad",
  establecimientoId: establishmentId,
  cupo: null,
  estadoTexto: "activa",
  categoriaActividadId: null,
  publicosObjetivoIds: [],
  horarios: [],
  asignados: [],
};

function parses(overrides: Record<string, unknown> = {}) {
  return actividadSchema.safeParse({ ...oldContract, ...overrides });
}

async function main() {
  // Descripciones, nivel, edades, imagen y color.
  ok(parses().success, "El contrato anterior debe seguir siendo válido");
  ok(parses({ descripcionCorta: "Movilidad y respiración" }).success);
  ok(!parses({ descripcionCorta: "x".repeat(181) }).success);
  ok(
    parses({ descripcionCorta: "   " }).success,
    "Los espacios se normalizan a null",
  );
  ok(parses({ nivel: null }).success);
  ok(parses({ nivel: "INICIAL" }).success);
  ok(!parses({ nivel: "EXPERTO" }).success);
  ok(parses({ edadMinima: null, edadMaxima: null }).success);
  ok(parses({ edadMinima: 18 }).success);
  ok(parses({ edadMaxima: 12 }).success);
  ok(parses({ edadMinima: 13, edadMaxima: 17 }).success);
  ok(!parses({ edadMinima: -1 }).success);
  ok(!parses({ edadMinima: 10.5 }).success);
  ok(!parses({ edadMinima: 18, edadMaxima: 17 }).success);
  ok(parses({ imagenUrl: "https://example.com/yoga.jpg" }).success);
  ok(parses({ imagenUrl: "/uploads/actividades/yoga.jpg" }).success);
  ok(!parses({ imagenUrl: "javascript:alert(1)" }).success);
  ok(parses({ color: "#1d4f36" }).success);
  equal(parses({ color: "#1d4f36" }).data?.color, "#1D4F36");
  ok(!parses({ color: "red" }).success);

  // Requisitos y contrato económico.
  ok(
    parses({ requiereCertificadoMedico: false, requiereAutorizacion: false })
      .success,
  );
  ok(
    parses({ requiereCertificadoMedico: true, requiereAutorizacion: false })
      .success,
  );
  ok(
    parses({ requiereCertificadoMedico: false, requiereAutorizacion: true })
      .success,
  );
  ok(
    parses({ requiereCertificadoMedico: true, requiereAutorizacion: true })
      .success,
  );
  ok(parses({ esGratuita: true }).success);
  ok(parses({ esGratuita: true, precio: "100.00" }).success);
  ok(parses({ esGratuita: false, precio: "15000.00" }).success);
  ok(!parses({ esGratuita: false, precio: null }).success);
  ok(!parses({ esGratuita: false, precio: "0" }).success);
  ok(!parses({ esGratuita: false, precio: "-1" }).success);
  ok(!parses({ esGratuita: false, precio: "10.999" }).success);
  ok(!parses({ esGratuita: false, precio: "NaN" }).success);
  ok(!parses({ esGratuita: false, precio: "Infinity" }).success);
  ok(
    !updateActividadSchema.safeParse({}).success,
    "PATCH vacío debe rechazarse",
  );

  await prisma.establecimiento.create({
    data: {
      id: establishmentId,
      nombre: "Establecimiento temporal - prueba actividad",
      direccion: "Dirección temporal",
    },
  });

  const legacyInput = actividadSchema.parse(oldContract);
  const legacy = await createActividad(legacyInput);
  createdIds.push(legacy.id);
  equal(legacy.descripcionCorta, null);
  equal(legacy.nivel, null);
  equal(legacy.edadMinima, null);
  equal(legacy.edadMaxima, null);
  equal(legacy.requiereCertificadoMedico, false);
  equal(legacy.requiereAutorizacion, false);
  equal(legacy.esGratuita, true);
  equal(legacy.precio, null);

  const category = await prisma.categoriaActividad.findFirst({
    where: { activo: true },
  });
  const targetPublic = await prisma.publicoObjetivo.findFirst({
    where: { activo: true },
  });
  const detailedInput = actividadSchema.parse({
    ...oldContract,
    nombre: "Actividad paga temporal",
    descripcionCorta: "Descripción breve",
    descripcion: "Descripción completa inicial",
    imagenUrl: "/uploads/actividades/prueba.jpg",
    color: "#819b56",
    nivel: "INICIAL",
    edadMinima: 13,
    edadMaxima: 17,
    requiereCertificadoMedico: true,
    requiereAutorizacion: true,
    esGratuita: false,
    precio: "15000",
    categoriaActividadId: category?.id ?? null,
    publicosObjetivoIds: targetPublic ? [targetPublic.id] : [],
  });
  let detailed = await createActividad(detailedInput);
  createdIds.push(detailed.id);
  equal(detailed.precio, "15000.00", "Decimal debe serializarse como string");
  equal(detailed.color, "#819B56");
  equal(
    (await getActividad(detailed.id))?.descripcionCorta,
    "Descripción breve",
  );

  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({ nivel: "INTERMEDIO" }),
  );
  equal(detailed.nivel, "INTERMEDIO");
  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({ nivel: null }),
  );
  equal(detailed.nivel, null);
  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({
      descripcion: "Descripción completa editada",
    }),
  );
  equal(detailed.descripcion, "Descripción completa editada");

  await assert.rejects(
    () =>
      patchActividad(
        detailed.id,
        updateActividadSchema.parse({ edadMinima: 18 }),
      ),
    /edad máxima/i,
  );
  assertions += 1;

  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({ requiereCertificadoMedico: false }),
  );
  equal(detailed.requiereCertificadoMedico, false);
  equal(detailed.requiereAutorizacion, true);
  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({ esGratuita: true }),
  );
  equal(detailed.esGratuita, true);
  equal(detailed.precio, null);

  await assert.rejects(
    () =>
      patchActividad(
        detailed.id,
        updateActividadSchema.parse({ esGratuita: false }),
      ),
    /precio/i,
  );
  assertions += 1;
  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({ precio: "200" }),
  );
  equal(
    detailed.precio,
    null,
    "Un PATCH de precio sobre una actividad gratuita no debe persistirlo",
  );
  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({ esGratuita: false, precio: "200.50" }),
  );
  equal(detailed.precio, "200.50");

  const generalSnapshot = {
    descripcionCorta: detailed.descripcionCorta,
    color: detailed.color,
    precio: detailed.precio,
  };
  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({
      categoriaActividadId: category?.id ?? null,
      publicosObjetivoIds: targetPublic ? [targetPublic.id] : [],
    }),
  );
  assert.deepEqual(
    {
      descripcionCorta: detailed.descripcionCorta,
      color: detailed.color,
      precio: detailed.precio,
    },
    generalSnapshot,
  );
  assertions += 1;

  const relationSnapshot = {
    categoriaActividadId: detailed.categoriaActividadId,
    publicos: detailed.publicosObjetivo.map((item) => item.id),
  };
  detailed = await patchActividad(
    detailed.id,
    updateActividadSchema.parse({ color: "#FFFFFF" }),
  );
  equal(detailed.categoriaActividadId, relationSnapshot.categoriaActividadId);
  assert.deepEqual(
    detailed.publicosObjetivo.map((item) => item.id),
    relationSnapshot.publicos,
  );
  assertions += 1;

  const putInput = actividadSchema.parse({
    ...oldContract,
    nombre: detailed.nombre,
    descripcion: detailed.descripcion,
    esGratuita: false,
    precio: "350.00",
    categoriaActividadId: detailed.categoriaActividadId,
    publicosObjetivoIds: relationSnapshot.publicos,
  });
  detailed = await updateActividad(detailed.id, putInput);
  equal(detailed.precio, "350.00", "PUT debe conservar compatibilidad");

  console.log(`OK: ${assertions} verificaciones funcionales superadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const id of createdIds.reverse()) {
      await deleteActividad(id).catch(() => undefined);
    }
    await prisma.establecimiento.deleteMany({ where: { id: establishmentId } });
    await prisma.$disconnect();
  });
