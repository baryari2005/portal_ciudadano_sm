import { PrismaClient } from "./generated/requirements-seed-client";
const prisma = new PrismaClient();
async function main() {
  for (const accion of ["ver", "crear", "editar", "eliminar", "asignar"]) {
    await prisma.permiso.upsert({ where: { modulo_accion: { modulo: "access", accion } }, update: { activo: true }, create: { modulo: "access", accion, nombre: `Control de ingreso: ${accion}`, activo: true } });
  }
  console.log(`Permisos de acceso: ${await prisma.permiso.count({ where: { modulo: "access" } })}; asignaciones: ${await prisma.rolPermiso.count({ where: { permiso: { modulo: "access" } } })}`);
}
main().finally(() => prisma.$disconnect());
