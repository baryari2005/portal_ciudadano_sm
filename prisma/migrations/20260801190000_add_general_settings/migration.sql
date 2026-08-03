ALTER TYPE "AuditoriaEntidad" ADD VALUE IF NOT EXISTS 'PARAMETROS_GENERALES';

CREATE TABLE "ParametrosGenerales" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "registrosPorPagina" INTEGER NOT NULL DEFAULT 6,
  "imagenLoginCollage1" TEXT,
  "imagenLoginCollage2" TEXT,
  "imagenLoginCollage3" TEXT,
  "imagenLoginCollage4" TEXT,
  "updatedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ParametrosGenerales_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ParametrosGenerales_singleton_check" CHECK ("id" = 1),
  CONSTRAINT "ParametrosGenerales_page_size_check" CHECK ("registrosPorPagina" BETWEEN 3 AND 100)
);

INSERT INTO "ParametrosGenerales" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Permiso" ("modulo", "accion", "nombre", "descripcion", "icono", "activo", "createdAt", "updatedAt")
VALUES
  ('general_settings', 'ver', 'general_settings:ver', 'Permite visualizar los parámetros generales.', 'eye', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('general_settings', 'editar', 'general_settings:editar', 'Permite modificar los parámetros generales.', 'pencil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("modulo", "accion") DO UPDATE SET "activo" = true, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolPermiso" ("rolId", "permisoId", "createdAt")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "Rol" r CROSS JOIN "Permiso" p
WHERE r."codigo" = 'admin' AND p."modulo" = 'general_settings'
ON CONFLICT ("rolId", "permisoId") DO NOTHING;
