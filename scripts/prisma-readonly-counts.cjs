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

const tables = [
  "usuario",
  "rol",
  "permiso",
  "rolPermiso",
  "establecimiento",
  "actividad",
  "horarioActividad",
  "actividadUsuario",
];

async function main() {
  for (const table of tables) {
    const count = await prisma[table].count();
    console.log(`${table}=${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
