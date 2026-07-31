import { PrismaClient } from "./generated/requirements-seed-client";
const prisma=new PrismaClient();
async function main(){for(const accion of["ver","crear","editar","eliminar","asignar"])await prisma.permiso.upsert({where:{modulo_accion:{modulo:"audit_log",accion}},update:{activo:true},create:{modulo:"audit_log",accion,nombre:`Auditoría: ${accion}`,activo:true}});console.log(`Permisos de auditoría: ${await prisma.permiso.count({where:{modulo:"audit_log"}})}; asignaciones: ${await prisma.rolPermiso.count({where:{permiso:{modulo:"audit_log"}}})}`)}
main().finally(()=>prisma.$disconnect());
