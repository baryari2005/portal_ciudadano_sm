import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const expected = {
  RECEPCION: [
    "access:asignar", "access:crear", "access:editar", "access:eliminar", "access:ver",
    "actividades:ver", "activity_schedules:ver", "enrollment_documents:asignar",
    "enrollment_documents:editar", "enrollment_documents:ver", "enrollments:asignar",
    "enrollments:crear", "enrollments:editar", "enrollments:eliminar", "enrollments:ver",
    "establecimientos:ver", "legajo:ver", "requirements:ver", "usuarios:asignar",
    "usuarios:crear", "usuarios:editar", "usuarios:ver",
  ],
  PROFESOR: [
    "activity_schedules:ver", "activity_sessions:ver", "attendance:asignar",
    "attendance:crear", "attendance:editar", "attendance:eliminar", "attendance:ver",
    "enrollments:ver",
  ],
  user: [],
} as const;

async function main() {
  const roles = await prisma.rol.findMany({
    where: { nombre: { in: ["admin", ...Object.keys(expected)] } },
    select: {
      nombre: true,
      permisos: { select: { permiso: { select: { modulo: true, accion: true, activo: true } } } },
    },
  });
  const activePermissionCount = await prisma.permiso.count({ where: { activo: true } });

  for (const roleName of ["admin", ...Object.keys(expected)]) {
    const role = roles.find((item) => item.nombre === roleName);
    if (!role) throw new Error(`No existe el rol ${roleName}.`);

    const actual = role.permisos
      .filter(({ permiso }) => permiso.activo)
      .map(({ permiso }) => `${permiso.modulo}:${permiso.accion}`)
      .sort();
    const wanted = roleName === "admin"
      ? activePermissionCount
      : [...expected[roleName as keyof typeof expected]].sort();

    if (typeof wanted === "number") {
      if (actual.length !== wanted) {
        throw new Error(`admin tiene ${actual.length} de ${wanted} permisos activos.`);
      }
    } else if (actual.join("|") !== wanted.join("|")) {
      const wantedSet = new Set<string>(wanted);
      const actualSet = new Set<string>(actual);
      const missing = wanted.filter((key) => !actualSet.has(key));
      const unexpected = actual.filter((key) => !wantedSet.has(key));
      throw new Error(
        `${roleName}: faltan [${missing.join(", ")}], sobran [${unexpected.join(", ")}].`,
      );
    }

    console.log(`OK ${roleName}: ${actual.length} permisos activos.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
