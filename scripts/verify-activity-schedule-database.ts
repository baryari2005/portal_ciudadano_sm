import { prisma } from "../src/lib/db";

async function main() {
  const [columns, constraints, indexes, enums, permissions, assignments, temporary] = await Promise.all([
    prisma.$queryRaw<Array<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>>`SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('ActividadHorario', 'ActividadHorarioProfesor') ORDER BY table_name, ordinal_position`,
    prisma.$queryRaw<Array<{ table_name: string; constraint_name: string; constraint_type: string }>>`SELECT tc.table_name, tc.constraint_name, tc.constraint_type FROM information_schema.table_constraints tc WHERE tc.table_schema = 'public' AND tc.table_name IN ('ActividadHorario', 'ActividadHorarioProfesor') ORDER BY tc.table_name, tc.constraint_name`,
    prisma.$queryRaw<Array<{ tablename: string; indexname: string }>>`SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('ActividadHorario', 'ActividadHorarioProfesor') ORDER BY tablename, indexname`,
    prisma.$queryRaw<Array<{ enum_name: string; enum_value: string }>>`SELECT t.typname AS enum_name, e.enumlabel AS enum_value FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname IN ('DiaSemana', 'HorarioActividadEstado') ORDER BY t.typname, e.enumsortorder`,
    prisma.permiso.findMany({ where: { modulo: "activity_schedules" }, select: { modulo: true, accion: true }, orderBy: { accion: "asc" } }),
    prisma.rolPermiso.count({ where: { permiso: { modulo: "activity_schedules" } } }),
    Promise.all([prisma.horarioActividad.count({ where: { actividadId: { startsWith: "test-activity-" } } }), prisma.usuario.count({ where: { userId: { startsWith: "qa-" } } })]),
  ]);
  console.log(JSON.stringify({ columns, constraints, indexes, enums, permissions, roleAssignments: assignments, temporary: { schedules: temporary[0], users: temporary[1] } }, null, 2));
}

main().finally(() => prisma.$disconnect());
