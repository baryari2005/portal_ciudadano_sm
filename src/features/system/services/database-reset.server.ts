import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { CatalogValidationError } from "@/lib/errors/catalog-errors";

export const DATABASE_RESET_CONFIRMATION = "REINICIAR BASE DE DATOS";
const BASE_ROLE_CODES = ["admin", "reception", "teacher", "citizen"];
const PRESERVED_TABLES = new Set(["Usuario", "Rol", "Permiso", "RolPermiso", "CoberturaMedica"]);

const TABLES_TO_CLEAR = Prisma.dmmf.datamodel.models
  .map((model) => model.dbName ?? model.name)
  .filter((tableName) => !PRESERVED_TABLES.has(tableName));

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export type DatabaseResetPreview = {
  adminEmail: string;
  users: number;
  activities: number;
  establishments: number;
  professors: number;
  enrollments: number;
  sessions: number;
  personalDocuments: number;
  notifications: number;
  auditRecords: number;
};

async function requireAdminUser(userId: string) {
  const user = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { id: true, email: true, rol: { select: { codigo: true } } },
  });
  if (!user || user.rol.codigo !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function getDatabaseResetPreview(userId: string): Promise<DatabaseResetPreview> {
  const admin = await requireAdminUser(userId);
  const [users, activities, establishments, professors, enrollments, sessions, personalDocuments, notifications, auditRecords] = await Promise.all([
    prisma.usuario.count({ where: { id: { not: admin.id } } }),
    prisma.actividad.count(),
    prisma.establecimiento.count(),
    prisma.profesor.count(),
    prisma.inscripcion.count(),
    prisma.claseActividad.count(),
    prisma.documentoUsuario.count(),
    prisma.notificacion.count(),
    prisma.registroAuditoria.count(),
  ]);
  return { adminEmail: admin.email, users, activities, establishments, professors, enrollments, sessions, personalDocuments, notifications, auditRecords };
}

export async function resetDatabaseData(input: { userId: string; email: string; confirmation: string }) {
  const admin = await requireAdminUser(input.userId);
  if (input.email.trim().toLowerCase() !== admin.email.toLowerCase()) {
    throw new CatalogValidationError("El correo informado no coincide con el administrador actual.");
  }
  if (input.confirmation.trim() !== DATABASE_RESET_CONFIRMATION) {
    throw new CatalogValidationError(`Escribí exactamente: ${DATABASE_RESET_CONFIRMATION}`);
  }

  const preview = await getDatabaseResetPreview(admin.id);
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({ where: { id: admin.id }, data: { coberturaMedicaId: null } });

    // Los identificadores provienen exclusivamente del modelo Prisma compilado.
    if (TABLES_TO_CLEAR.length) {
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE ${TABLES_TO_CLEAR.map(quoteIdentifier).join(", ")} RESTART IDENTITY CASCADE`,
      );
    }

    await tx.usuario.deleteMany({ where: { id: { not: admin.id } } });
    await tx.coberturaMedica.deleteMany();

    const customRoles = await tx.rol.findMany({
      where: { codigo: { notIn: BASE_ROLE_CODES } },
      select: { id: true },
    });
    const customRoleIds = customRoles.map((role) => role.id);
    if (customRoleIds.length) {
      await tx.rolPermiso.deleteMany({ where: { rolId: { in: customRoleIds } } });
      await tx.rol.deleteMany({ where: { id: { in: customRoleIds } } });
    }

    await tx.registroAuditoria.create({
      data: {
        actorId: admin.id,
        actorNombre: "Administrador Sistema",
        actorEmail: admin.email,
        accion: "ELIMINAR",
        entidadTipo: "PERMISO",
        entidadNombre: "Reinicio de datos de prueba",
        metadata: preview as unknown as Prisma.InputJsonValue,
        origen: "ADMINISTRACION",
      },
    });
  }, { maxWait: 10_000, timeout: 120_000 });

  return { ok: true, preservedAdminId: admin.id, preview };
}
