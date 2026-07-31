import { PrismaClient, RequisitoTipo } from "./generated/requirements-seed-client";
const prisma = new PrismaClient();
const requirements = [
  ["DNI", "dni", RequisitoTipo.DOCUMENTO, true],
  ["Certificado médico", "certificado-medico", RequisitoTipo.DOCUMENTO, true],
  ["Apto físico", "apto-fisico", RequisitoTipo.DOCUMENTO, true],
  ["Autorización de madre, padre o tutor", "autorizacion-de-tutor", RequisitoTipo.DOCUMENTO, true],
  ["Consentimiento informado", "consentimiento-informado", RequisitoTipo.CONSENTIMIENTO, false],
  ["Declaración jurada", "declaracion-jurada", RequisitoTipo.CONSENTIMIENTO, false],
  ["Comprobante de domicilio", "comprobante-de-domicilio", RequisitoTipo.DOCUMENTO, true],
  ["Certificado de discapacidad", "certificado-de-discapacidad", RequisitoTipo.DOCUMENTO, true],
] as const;
async function main() {
  for (const [nombre, slug, tipo, requiereDocumento] of requirements) await prisma.requisito.upsert({ where: { slug }, update: { nombre, tipo, requiereDocumento }, create: { nombre, slug, tipo, requiereDocumento } });
  for (const accion of ["ver", "crear", "editar", "eliminar", "asignar"]) await prisma.permiso.upsert({ where: { modulo_accion: { modulo: "requirements", accion } }, update: { activo: true }, create: { modulo: "requirements", accion, nombre: `Requisitos: ${accion}`, activo: true } });
  console.log(`Requisitos: ${await prisma.requisito.count({ where: { slug: { in: requirements.map((item) => item[1]) } } })}; permisos: ${await prisma.permiso.count({ where: { modulo: "requirements" } })}; asignaciones: ${await prisma.rolPermiso.count({ where: { permiso: { modulo: "requirements" } } })}`);
}
main().finally(() => prisma.$disconnect());
