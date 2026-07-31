import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.$executeRaw`
    UPDATE "ActividadHorario" AS horario
    SET "establecimientoId" = actividad."establecimientoId"
    FROM "Actividad" AS actividad
    WHERE horario."actividadId" = actividad."id"
      AND horario."establecimientoId" IS NULL
  `;
  console.log(`Horarios actualizados: ${updated}`);
}

main().finally(() => prisma.$disconnect());
