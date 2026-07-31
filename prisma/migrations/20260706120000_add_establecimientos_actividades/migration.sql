-- Add non-destructive establecimientos/actividades fields and relations.

ALTER TABLE "Actividad"
  ADD COLUMN IF NOT EXISTS "cupo" INTEGER,
  ADD COLUMN IF NOT EXISTS "estadoTexto" TEXT DEFAULT 'activa';

ALTER TABLE "Actividad"
  ALTER COLUMN "categoria" SET DEFAULT 'EDUCACION',
  ALTER COLUMN "cupoMaximo" SET DEFAULT 0;

ALTER TABLE "Establecimiento"
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "estado" TEXT NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS "observacion" TEXT,
  ADD COLUMN IF NOT EXISTS "telefono" TEXT;

CREATE TABLE IF NOT EXISTS "HorarioEstablecimiento" (
  "id" TEXT NOT NULL,
  "establecimientoId" TEXT NOT NULL,
  "diaSemana" TEXT NOT NULL,
  "horaApertura" TEXT NOT NULL,
  "horaCierre" TEXT NOT NULL,
  "cerrado" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HorarioEstablecimiento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ActividadUsuario" (
  "id" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "usuarioId" UUID NOT NULL,
  "funcion" TEXT,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActividadUsuario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HorarioEstablecimiento_establecimientoId_idx" ON "HorarioEstablecimiento"("establecimientoId");
CREATE INDEX IF NOT EXISTS "ActividadUsuario_actividadId_idx" ON "ActividadUsuario"("actividadId");
CREATE INDEX IF NOT EXISTS "ActividadUsuario_usuarioId_idx" ON "ActividadUsuario"("usuarioId");
CREATE UNIQUE INDEX IF NOT EXISTS "ActividadUsuario_actividadId_usuarioId_key" ON "ActividadUsuario"("actividadId", "usuarioId");

INSERT INTO "Permiso" ("modulo", "accion", "nombre", "descripcion", "icono", "activo", "createdAt", "updatedAt")
VALUES
  ('establecimientos', 'ver', 'establecimientos:ver', 'Permite visualizar establecimientos.', 'eye', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('establecimientos', 'crear', 'establecimientos:crear', 'Permite crear establecimientos.', 'plus', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('establecimientos', 'editar', 'establecimientos:editar', 'Permite editar establecimientos.', 'pencil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('establecimientos', 'eliminar', 'establecimientos:eliminar', 'Permite eliminar establecimientos.', 'trash', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('actividades', 'ver', 'actividades:ver', 'Permite visualizar actividades.', 'eye', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('actividades', 'crear', 'actividades:crear', 'Permite crear actividades.', 'plus', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('actividades', 'editar', 'actividades:editar', 'Permite editar actividades.', 'pencil', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('actividades', 'eliminar', 'actividades:eliminar', 'Permite eliminar actividades.', 'trash', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("modulo", "accion") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "icono" = EXCLUDED."icono",
  "activo" = EXCLUDED."activo",
  "updatedAt" = CURRENT_TIMESTAMP;
