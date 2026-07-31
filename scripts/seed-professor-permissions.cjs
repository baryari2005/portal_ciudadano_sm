const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const prisma = new PrismaClient();
const permissions = [
  ["ver", "Permite visualizar profesores y responsables.", "eye"],
  ["crear", "Permite crear perfiles de profesores.", "plus"],
  ["editar", "Permite editar información de profesores.", "pencil"],
  ["eliminar", "Permite desactivar, reactivar o suspender profesores.", "trash"],
  ["asignar", "Permite asignar profesores a horarios de actividades.", "user-plus"],
];

async function main() {
  for (const [accion, descripcion, icono] of permissions) {
    await prisma.permiso.upsert({
      where: { modulo_accion: { modulo: "profesores", accion } },
      update: {
        nombre: `profesores:${accion}`,
        descripcion,
        icono,
        activo: true,
      },
      create: {
        modulo: "profesores",
        accion,
        nombre: `profesores:${accion}`,
        descripcion,
        icono,
        activo: true,
      },
    });
  }

  console.log(`Permisos de profesores insertados/actualizados: ${permissions.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
