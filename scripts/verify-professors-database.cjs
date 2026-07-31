const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const prisma = new PrismaClient();

async function main() {
  const database = await prisma.$queryRaw`SELECT current_database() AS database, current_schema() AS schema, NOW() AS checked_at`;
  const enumValues = await prisma.$queryRaw`SELECT e.enumlabel AS value FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'ProfesorEstado' ORDER BY e.enumsortorder`;
  const columns = await prisma.$queryRaw`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Profesor' ORDER BY ordinal_position`;
  const constraints = await prisma.$queryRaw`SELECT c.conname AS name, c.contype AS type, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname = 'public' AND t.relname = 'Profesor' ORDER BY c.conname`;
  const indexes = await prisma.$queryRaw`SELECT indexname AS name, indexdef AS definition FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'Profesor' ORDER BY indexname`;
  const counts = {
    roles: await prisma.rol.count(),
    permisos: await prisma.permiso.count(),
    rolPermiso: await prisma.rolPermiso.count(),
    profesores: await prisma.profesor.count(),
  };
  const professorPermissions = await prisma.permiso.findMany({ where: { modulo: "profesores" }, select: { accion: true, nombre: true, descripcion: true, activo: true }, orderBy: { accion: "asc" } });
  const professorRoleLinks = await prisma.rolPermiso.count({ where: { permiso: { modulo: "profesores" } } });

  console.log(JSON.stringify({ database, enumValues, columns, constraints, indexes, counts, professorPermissions, professorRoleLinks }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
