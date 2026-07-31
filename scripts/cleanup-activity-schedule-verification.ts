import { prisma } from "../src/lib/db";

async function main() {
  const activities = await prisma.actividad.findMany({ where: { id: { startsWith: "test-activity-" } }, select: { id: true } });
  const users = await prisma.usuario.findMany({ where: { userId: { startsWith: "qa-" } }, select: { id: true, profesor: { select: { id: true } } } });
  const activityIds = activities.map((item) => item.id);
  const professorIds = users.flatMap((item) => item.profesor ? [item.profesor.id] : []);
  const scheduleDelete = await prisma.horarioActividad.deleteMany({ where: { actividadId: { in: activityIds } } });
  const professorDelete = await prisma.profesor.deleteMany({ where: { id: { in: professorIds } } });
  const userDelete = await prisma.usuario.deleteMany({ where: { id: { in: users.map((item) => item.id) } } });
  const activityDelete = await prisma.actividad.deleteMany({ where: { id: { in: activityIds } } });
  const establishmentDelete = await prisma.establecimiento.deleteMany({ where: { id: { startsWith: "test-facility-" } } });
  console.log({ schedules: scheduleDelete.count, professors: professorDelete.count, users: userDelete.count, activities: activityDelete.count, establishments: establishmentDelete.count });
}

main().finally(() => prisma.$disconnect());
