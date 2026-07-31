// prisma/seed.ts
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import bcrypt from "bcryptjs";
// import { seedLeaveTypes } from "./seed.leave-types";

const prisma = new PrismaClient();

async function main() {
  const ADMIN_USERID = process.env.ADMIN_USERID || "admin";
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@local";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

  // 1) Rol admin (upsert)
  const adminRol = await prisma.rol.upsert({
    where: { codigo: "admin" },
    update: { nombre: "Administrador" },
    create: { codigo: "admin", nombre: "Administrador" },
  });

  // 2) Hashear password
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 3) Usuario admin (upsert por email único)
  const adminUser = await prisma.usuario.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      userId: ADMIN_USERID,
      password: hash,
      rolId: adminRol.id,
      nombre: "Admin",
      apellido: "Root",
    },
    create: {
      userId: ADMIN_USERID,
      email: ADMIN_EMAIL,
      password: hash,
      rolId: adminRol.id,
      nombre: "Admin",
      apellido: "Root",
      avatarUrl: null,
    },
    include: { rol: true },
  });

  //  await seedLeaveTypes(prisma);

  console.log("✅ Seed OK");
  console.log("Rol admin:", adminRol);
  console.log("Usuario admin:", {
    id: adminUser.id,
    userId: adminUser.userId,
    email: adminUser.email,
    rol: adminUser.rol?.nombre,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
