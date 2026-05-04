import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const PERMISOS = [
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
];

const ROLES = [
  {
    nombre: "admin",
    descripcion: "Administrador del sistema con acceso completo",
    permisos: PERMISOS.map(p => `${p.modulo}:${p.accion}`), // Todos los permisos
  },
  {
    nombre: "user",
    descripcion: "Usuario estándar con permisos limitados",
    permisos: [
      "legajo:ver",
      "usuarios:ver",
      "usuarios:editar", // Solo editar su propio perfil
    ],
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
        descripcion: p.descripcion,
        icono: p.icono,
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
      where: { nombre: roleData.nombre },
      update: { descripcion: roleData.descripcion },
      create: {
        nombre: roleData.nombre,
        descripcion: roleData.descripcion,
      },
    });

    // Limpiar permisos existentes del rol
    await prisma.rolPermiso.deleteMany({
      where: { rolId: role.id },
    });

    // Obtener permisos a asignar
    const permisosToAssign = await prisma.permiso.findMany({
      where: {
        OR: roleData.permisos.map(permisoStr => {
          const [modulo, accion] = permisoStr.split(":");
          return { modulo, accion };
        }),
      },
    });

    // Crear asociaciones rol-permiso
    await prisma.rolPermiso.createMany({
      data: permisosToAssign.map((permiso) => ({
        rolId: role.id,
        permisoId: permiso.id,
      })),
      skipDuplicates: true,
    });

    console.log(`✅ Rol "${role.nombre}" creado con ${permisosToAssign.length} permisos`);
  }

  // 3. Crear usuario admin si no existe
  console.log("👤 Verificando usuario admin...");
  const adminRole = await prisma.rol.findFirst({
    where: { nombre: "admin" },
  });

  if (!adminRole) {
    throw new Error("Rol 'admin' no encontrado. Verifica que el seed se ejecutó correctamente.");
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
