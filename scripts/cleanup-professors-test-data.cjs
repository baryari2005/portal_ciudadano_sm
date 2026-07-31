const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.usuario.findMany({ where: { userId: { startsWith: "codex-prof-test-" } }, select: { id: true } });
  const roles = await prisma.rol.findMany({ where: { nombre: { startsWith: "codex-prof-test-" } }, select: { id: true } });
  const userIds = users.map(({ id }) => id);
  const roleIds = roles.map(({ id }) => id);

  const deletedProfessors = await prisma.profesor.deleteMany({ where: { usuarioId: { in: userIds } } });
  const deletedUsers = await prisma.usuario.deleteMany({ where: { id: { in: userIds } } });
  const deletedLinks = await prisma.rolPermiso.deleteMany({ where: { rolId: { in: roleIds } } });
  const deletedRoles = await prisma.rol.deleteMany({ where: { id: { in: roleIds } } });
  console.log(JSON.stringify({ profesores: deletedProfessors.count, usuarios: deletedUsers.count, rolPermiso: deletedLinks.count, roles: deletedRoles.count }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
