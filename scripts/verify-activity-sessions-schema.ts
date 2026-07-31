import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
async function main() {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('ClaseActividad', 'ClaseActividadProfesor')
    ORDER BY table_name`;
  const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string; data_type: string }>>`
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('ClaseActividad', 'ClaseActividadProfesor')
    ORDER BY table_name, ordinal_position`;
  const constraints = await prisma.$queryRaw<Array<{ conname: string; contype: string; definition: string }>>`
    SELECT conname, contype::text, pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid IN ('"ClaseActividad"'::regclass, '"ClaseActividadProfesor"'::regclass)
    ORDER BY conname`;
  const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE typname = 'ClaseActividadEstado' ORDER BY enumsortorder`;
  const permissions = await prisma.permiso.findMany({ where: { modulo: "activity_sessions" }, select: { accion: true }, orderBy: { accion: "asc" } });
  const assignments = await prisma.rolPermiso.count({ where: { permiso: { modulo: "activity_sessions" } } });
  console.log(JSON.stringify({ tables, columns, constraints, enumValues, permissions, assignments }, null, 2));
}
main().finally(() => prisma.$disconnect());
