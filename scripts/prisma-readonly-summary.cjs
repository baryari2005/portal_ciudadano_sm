const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);

  if (!match || process.env[match[1]]) {
    continue;
  }

  process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.rol.findMany({
    select: { nombre: true },
    orderBy: { nombre: "asc" },
  });
  const usuarios = await prisma.usuario.findMany({
    select: { userId: true, email: true, estado: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const establecimientos = await prisma.establecimiento.findMany({
    select: { nombre: true, direccion: true, estado: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("roles=" + roles.map((role) => role.nombre).join(", "));
  console.log(
    "usuarios=" +
      usuarios
        .map((user) => `${user.userId}|${user.email}|${user.estado}`)
        .join("; ")
  );
  console.log(
    "establecimientos=" +
      establecimientos
        .map((item) => `${item.nombre}|${item.direccion}|${item.estado}`)
        .join("; ")
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
