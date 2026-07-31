import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const BASE_PERMISOS = [
  // Legajo
  {
    modulo: "legajo",
    accion: "ver",
    descripcion: "Permite visualizar la información del legajo.",
    icono: "fileText",
  },
  {
    modulo: "legajo",
    accion: "editar",
    descripcion: "Permite modificar la información del legajo.",
    icono: "pencil",
  },

  // Roles
  {
    modulo: "roles",
    accion: "ver",
    descripcion: "Permite visualizar roles y permisos disponibles.",
    icono: "eye",
  },
  {
    modulo: "roles",
    accion: "crear",
    descripcion: "Permite crear nuevos roles.",
    icono: "plus",
  },
  {
    modulo: "roles",
    accion: "editar",
    descripcion: "Permite modificar la configuración de un rol.",
    icono: "pencil",
  },
  {
    modulo: "roles",
    accion: "eliminar",
    descripcion: "Permite eliminar roles del sistema.",
    icono: "trash",
  },

  // Usuarios
  {
    modulo: "usuarios",
    accion: "ver",
    descripcion: "Permite visualizar el listado y detalle de usuarios.",
    icono: "eye",
  },
  {
    modulo: "usuarios",
    accion: "crear",
    descripcion: "Permite dar de alta nuevos usuarios en el sistema.",
    icono: "plus",
  },
  {
    modulo: "usuarios",
    accion: "editar",
    descripcion: "Permite modificar los datos de un usuario existente.",
    icono: "pencil",
  },
  {
    modulo: "usuarios",
    accion: "eliminar",
    descripcion: "Permite eliminar usuarios del sistema.",
    icono: "trash",
  },
  {
    modulo: "usuarios",
    accion: "importar",
    descripcion: "Permite importar usuarios desde archivos externos.",
    icono: "upload",
  },
  {
    modulo: "usuarios",
    accion: "exportar",
    descripcion: "Permite exportar usuarios a un archivo.",
    icono: "download",
  },

  // Establecimientos
  {
    modulo: "establecimientos",
    accion: "ver",
    descripcion: "Permite visualizar establecimientos.",
    icono: "eye",
  },
  {
    modulo: "establecimientos",
    accion: "crear",
    descripcion: "Permite crear establecimientos.",
    icono: "plus",
  },
  {
    modulo: "establecimientos",
    accion: "editar",
    descripcion: "Permite editar establecimientos.",
    icono: "pencil",
  },
  {
    modulo: "establecimientos",
    accion: "eliminar",
    descripcion: "Permite eliminar establecimientos.",
    icono: "trash",
  },

  // Actividades
  {
    modulo: "actividades",
    accion: "ver",
    descripcion: "Permite visualizar actividades.",
    icono: "eye",
  },
  {
    modulo: "actividades",
    accion: "crear",
    descripcion: "Permite crear actividades.",
    icono: "plus",
  },
  {
    modulo: "actividades",
    accion: "editar",
    descripcion: "Permite editar actividades.",
    icono: "pencil",
  },
  {
    modulo: "actividades",
    accion: "eliminar",
    descripcion: "Permite eliminar actividades.",
    icono: "trash",
  },
];

const CATALOG_PERMISOS = [
  {
    modulo: "categorias_actividades",
    accion: "ver",
    descripcion: "Permite visualizar las categorías de actividades.",
    icono: "eye",
  },
  {
    modulo: "categorias_actividades",
    accion: "crear",
    descripcion: "Permite crear categorías de actividades.",
    icono: "plus",
  },
  {
    modulo: "categorias_actividades",
    accion: "editar",
    descripcion: "Permite editar categorías de actividades.",
    icono: "pencil",
  },
  {
    modulo: "categorias_actividades",
    accion: "eliminar",
    descripcion: "Permite eliminar o desactivar categorías de actividades.",
    icono: "trash",
  },
  {
    modulo: "publicos_objetivo",
    accion: "ver",
    descripcion: "Permite visualizar los públicos objetivo.",
    icono: "eye",
  },
  {
    modulo: "publicos_objetivo",
    accion: "crear",
    descripcion: "Permite crear públicos objetivo.",
    icono: "plus",
  },
  {
    modulo: "publicos_objetivo",
    accion: "editar",
    descripcion: "Permite editar públicos objetivo.",
    icono: "pencil",
  },
  {
    modulo: "publicos_objetivo",
    accion: "eliminar",
    descripcion: "Permite eliminar o desactivar públicos objetivo.",
    icono: "trash",
  },
];

const PROFESORES_PERMISOS = [
  {
    modulo: "profesores",
    accion: "ver",
    descripcion: "Permite visualizar profesores y responsables.",
    icono: "eye",
  },
  {
    modulo: "profesores",
    accion: "crear",
    descripcion: "Permite crear perfiles de profesores.",
    icono: "plus",
  },
  {
    modulo: "profesores",
    accion: "editar",
    descripcion: "Permite editar informaciÃ³n de profesores.",
    icono: "pencil",
  },
  {
    modulo: "profesores",
    accion: "eliminar",
    descripcion: "Permite desactivar o reactivar profesores.",
    icono: "trash",
  },
  {
    modulo: "profesores",
    accion: "asignar",
    descripcion: "Permite asignar profesores a horarios de actividades.",
    icono: "user-plus",
  },
];

const STANDARD_ACTIONS = ["ver", "crear", "editar", "eliminar", "asignar"] as const;

const MODULE_LABELS = {
  activity_schedules: "Horarios de actividades",
  enrollments: "Inscripciones",
  enrollment_documents: "Documentación de inscripciones",
  notifications: "Notificaciones",
  audit_log: "Auditoría",
  reports: "Reportes",
  activity_sessions: "Clases programadas",
  attendance: "Asistencias",
  requirements: "Requisitos",
  resources: "Recursos físicos",
  access: "Control de ingreso",
  user_records: "Ficha integral de usuarios",
} as const;

const OPERATIONAL_PERMISOS = Object.entries(MODULE_LABELS).flatMap(
  ([modulo, label]) =>
    STANDARD_ACTIONS.map((accion) => ({
      modulo,
      accion,
      descripcion: `Permite ${accion} en ${label.toLowerCase()}.`,
      icono:
        accion === "ver"
          ? "eye"
          : accion === "crear"
            ? "plus"
            : accion === "editar"
              ? "pencil"
              : accion === "eliminar"
                ? "trash"
                : "user-plus",
    })),
);

const USUARIOS_ASIGNAR_PERMISO = {
  modulo: "usuarios",
  accion: "asignar",
  descripcion: "Permite emitir y revocar credenciales QR de usuarios.",
  icono: "user-plus",
};

const SYSTEM_RESET_DATABASE_PERMISSION = {
  modulo: "system",
  accion: "reset_database",
  descripcion:
    "Permite eliminar todos los datos de prueba conservando el administrador y la seguridad base.",
  icono: "database-zap",
};

const PERMISOS = [
  ...BASE_PERMISOS,
  ...CATALOG_PERMISOS,
  ...PROFESORES_PERMISOS,
  USUARIOS_ASIGNAR_PERMISO,
  SYSTEM_RESET_DATABASE_PERMISSION,
  ...OPERATIONAL_PERMISOS,
];

const CATEGORIAS_ACTIVIDADES = [
  {
    nombre: "Deportes",
    slug: "deportes",
    descripcion: "Actividades deportivas y de movimiento.",
    color: "#1D4F36",
    icono: "dumbbell",
    orden: 10,
  },
  {
    nombre: "Cultura",
    slug: "cultura",
    descripcion: "Propuestas culturales y artísticas.",
    color: "#819B56",
    icono: "palette",
    orden: 20,
  },
  {
    nombre: "Educación",
    slug: "educacion",
    descripcion: "Talleres y espacios educativos.",
    color: "#1D4F36",
    icono: "book-open",
    orden: 30,
  },
  {
    nombre: "Salud",
    slug: "salud",
    descripcion: "Actividades vinculadas al bienestar y la salud.",
    color: "#819B56",
    icono: "heart",
    orden: 40,
  },
  {
    nombre: "Recreación",
    slug: "recreacion",
    descripcion: "Espacios recreativos y comunitarios.",
    color: "#1D4F36",
    icono: "sparkles",
    orden: 50,
  },
  {
    nombre: "Adultos mayores",
    slug: "adultos-mayores",
    descripcion: "Actividades orientadas a personas mayores.",
    color: "#819B56",
    icono: "users",
    orden: 60,
  },
  {
    nombre: "Juventud",
    slug: "juventud",
    descripcion: "Propuestas para jóvenes.",
    color: "#1D4F36",
    icono: "user-round",
    orden: 70,
  },
  {
    nombre: "Inclusión",
    slug: "inclusion",
    descripcion: "Actividades con enfoque inclusivo.",
    color: "#819B56",
    icono: "hand-heart",
    orden: 80,
  },
];

const PUBLICOS_OBJETIVO = [
  {
    nombre: "Niños",
    slug: "ninos",
    descripcion: "Actividades sugeridas para niños.",
    edadMinimaSugerida: 0,
    edadMaximaSugerida: 12,
    orden: 10,
  },
  {
    nombre: "Adolescentes",
    slug: "adolescentes",
    descripcion: "Actividades sugeridas para adolescentes.",
    edadMinimaSugerida: 13,
    edadMaximaSugerida: 17,
    orden: 20,
  },
  {
    nombre: "Adultos",
    slug: "adultos",
    descripcion: "Actividades sugeridas para adultos.",
    edadMinimaSugerida: 18,
    edadMaximaSugerida: 59,
    orden: 30,
  },
  {
    nombre: "Adultos mayores",
    slug: "adultos-mayores",
    descripcion: "Actividades sugeridas para adultos mayores.",
    edadMinimaSugerida: 60,
    edadMaximaSugerida: null,
    orden: 40,
  },
  {
    nombre: "Familia",
    slug: "familia",
    descripcion: "Actividades orientadas al grupo familiar.",
    edadMinimaSugerida: null,
    edadMaximaSugerida: null,
    orden: 50,
  },
];

const ROLES = [
  {
    codigo: "reception",
    nombre: "Recepción",
    descripcion: "Recepción con gestión operativa de vecinos, inscripciones e ingresos",
    permisos: [
      "usuarios:ver",
      "usuarios:crear",
      "usuarios:editar",
      "usuarios:asignar",
      "legajo:ver",
      "establecimientos:ver",
      "actividades:ver",
      "activity_schedules:ver",
      "enrollments:ver",
      "enrollments:crear",
      "enrollments:editar",
      "enrollments:eliminar",
      "enrollments:asignar",
      "enrollment_documents:ver",
      "enrollment_documents:editar",
      "enrollment_documents:asignar",
      "requirements:ver",
      "resources:ver",
      "access:ver",
      "access:crear",
      "access:editar",
      "access:eliminar",
      "access:asignar",
    ],
  },
  {
    codigo: "teacher",
    nombre: "Profesor",
    descripcion: "Profesor con acceso a sus horarios, clases, inscriptos y asistencias",
    permisos: [
      "activity_schedules:ver",
      "activity_sessions:ver",
      "enrollments:ver",
      "attendance:ver",
      "attendance:crear",
      "attendance:editar",
      "attendance:asignar",
    ],
  },
  {
    codigo: "admin",
    nombre: "Administrador",
    descripcion: "Administrador del sistema con acceso completo",
    permisos: PERMISOS.map((p) => `${p.modulo}:${p.accion}`),
  },
  {
    codigo: "citizen",
    nombre: "Ciudadano",
    descripcion: "Ciudadano con acceso exclusivo al portal de autogestión",
    permisos: [],
  },
];

async function main() {
  console.log("🌱 Iniciando seed de permisos, roles y usuario admin...");

  // 1. Crear permisos
  console.log("📝 Creando permisos...");
  for (const p of PERMISOS) {
    await prisma.permiso.upsert({
      where: {
        modulo_accion: {
          modulo: p.modulo,
          accion: p.accion,
        },
      },
      update: {
        nombre: `${p.modulo}:${p.accion}`,
        descripcion: p.descripcion,
        icono: p.icono,
        activo: true,
      },
      create: {
        modulo: p.modulo,
        accion: p.accion,
        nombre: `${p.modulo}:${p.accion}`,
        descripcion: p.descripcion,
        icono: p.icono,
      },
    });
  }
  console.log(`✅ ${PERMISOS.length} permisos creados/actualizados`);

  // 2. Crear roles y asignar permisos
  console.log("👥 Creando roles...");
  for (const roleData of ROLES) {
    const role = await prisma.rol.upsert({
      where: { codigo: roleData.codigo },
      update: { nombre: roleData.nombre, descripcion: roleData.descripcion },
      create: {
        codigo: roleData.codigo,
        nombre: roleData.nombre,
        descripcion: roleData.descripcion,
      },
    });

    // Obtener permisos a asignar
    const permisosToAssign = await prisma.permiso.findMany({
      where:
        roleData.codigo === "admin"
          ? { activo: true }
          : {
              OR: roleData.permisos.map((permisoStr) => {
                const [modulo, accion] = permisoStr.split(":");
                return { modulo, accion };
              }),
            },
    });

    if (
      roleData.codigo !== "admin" &&
      permisosToAssign.length !== roleData.permisos.length
    ) {
      const found = new Set(
        permisosToAssign.map((permiso) => `${permiso.modulo}:${permiso.accion}`),
      );
      const missing = roleData.permisos.filter((permiso) => !found.has(permiso));
      throw new Error(
        `El rol "${roleData.nombre}" referencia permisos inexistentes: ${missing.join(", ")}`,
      );
    }

    if (permisosToAssign.length === 0) {
      await prisma.rolPermiso.deleteMany({ where: { rolId: role.id } });
    } else {
      await prisma.$transaction([
        prisma.rolPermiso.deleteMany({ where: { rolId: role.id } }),
        prisma.rolPermiso.createMany({
          data: permisosToAssign.map((permiso) => ({
            rolId: role.id,
            permisoId: permiso.id,
          })),
          skipDuplicates: true,
        }),
      ]);
    }

    console.log(
      `✅ Rol "${role.nombre}" creado con ${permisosToAssign.length} permisos`,
    );
  }

  // 3. Crear catálogos base
  console.log("📚 Creando catálogos base de actividades...");
  for (const categoria of CATEGORIAS_ACTIVIDADES) {
    await prisma.categoriaActividad.upsert({
      where: { slug: categoria.slug },
      update: {
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        color: categoria.color,
        icono: categoria.icono,
        orden: categoria.orden,
        activo: true,
      },
      create: {
        nombre: categoria.nombre,
        slug: categoria.slug,
        descripcion: categoria.descripcion,
        color: categoria.color,
        icono: categoria.icono,
        orden: categoria.orden,
        activo: true,
      },
    });
  }
  console.log(
    `✅ ${CATEGORIAS_ACTIVIDADES.length} categorías creadas/actualizadas`,
  );

  console.log("👥 Creando públicos objetivo...");
  for (const publico of PUBLICOS_OBJETIVO) {
    await prisma.publicoObjetivo.upsert({
      where: { slug: publico.slug },
      update: {
        nombre: publico.nombre,
        descripcion: publico.descripcion,
        edadMinimaSugerida: publico.edadMinimaSugerida,
        edadMaximaSugerida: publico.edadMaximaSugerida,
        orden: publico.orden,
        activo: true,
      },
      create: {
        nombre: publico.nombre,
        slug: publico.slug,
        descripcion: publico.descripcion,
        edadMinimaSugerida: publico.edadMinimaSugerida,
        edadMaximaSugerida: publico.edadMaximaSugerida,
        orden: publico.orden,
        activo: true,
      },
    });
  }
  console.log(
    `✅ ${PUBLICOS_OBJETIVO.length} públicos objetivo creados/actualizados`,
  );

  // 4. Crear usuario admin si no existe
  console.log("👤 Verificando usuario admin...");
  const adminRole = await prisma.rol.findFirst({
    where: { codigo: "admin" },
  });

  if (!adminRole) {
    throw new Error(
      "Rol 'admin' no encontrado. Verifica que el seed se ejecutó correctamente.",
    );
  }

  const existingAdmin = await prisma.usuario.findFirst({
    where: { userId: "admin" },
  });

  if (!existingAdmin) {
    const hashedPassword = await hash("admin123", 10);

    await prisma.usuario.create({
      data: {
        userId: "admin",
        email: "admin@local",
        password: hashedPassword,
        nombre: "Administrador",
        apellido: "Sistema",
        rolId: adminRole.id,
        mustChangePassword: false,
      },
    });
    console.log("✅ Usuario admin creado (userId: admin, password: admin123)");
  } else {
    console.log("ℹ️ Usuario admin ya existe");
  }

  console.log("🎉 Seed completado exitosamente!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Error en el seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
