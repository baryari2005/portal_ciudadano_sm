CREATE TYPE "SolicitudAccesoEstado" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

ALTER TYPE "NotificacionTipo" ADD VALUE IF NOT EXISTS 'SOLICITUD_ACCESO_CREADA';
ALTER TYPE "NotificacionTipo" ADD VALUE IF NOT EXISTS 'SOLICITUD_ACCESO_APROBADA';
ALTER TYPE "NotificacionTipo" ADD VALUE IF NOT EXISTS 'SOLICITUD_ACCESO_RECHAZADA';

CREATE TABLE "SolicitudAcceso" (
  "id" TEXT NOT NULL,
  "usuarioId" UUID NOT NULL,
  "estado" "SolicitudAccesoEstado" NOT NULL DEFAULT 'PENDIENTE',
  "motivoRechazo" VARCHAR(500),
  "enviadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revisadaAt" TIMESTAMP(3),
  "revisadaPorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SolicitudAcceso_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SolicitudAcceso_usuarioId_enviadaAt_idx" ON "SolicitudAcceso"("usuarioId", "enviadaAt");
CREATE INDEX "SolicitudAcceso_estado_idx" ON "SolicitudAcceso"("estado");
CREATE INDEX "SolicitudAcceso_revisadaPorId_idx" ON "SolicitudAcceso"("revisadaPorId");
CREATE UNIQUE INDEX "SolicitudAcceso_usuario_pendiente_key" ON "SolicitudAcceso"("usuarioId") WHERE "estado" = 'PENDIENTE';

ALTER TABLE "SolicitudAcceso" ADD CONSTRAINT "SolicitudAcceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SolicitudAcceso" ADD CONSTRAINT "SolicitudAcceso_revisadaPorId_fkey" FOREIGN KEY ("revisadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SolicitudAcceso" ("id", "usuarioId", "estado", "enviadaAt", "revisadaAt", "createdAt", "updatedAt")
SELECT
  'legacy_' || "id",
  "id",
  CASE WHEN "estado" = 'RECHAZADO' THEN 'RECHAZADA'::"SolicitudAccesoEstado" ELSE 'PENDIENTE'::"SolicitudAccesoEstado" END,
  "createdAt",
  CASE WHEN "estado" = 'RECHAZADO' THEN "updatedAt" ELSE NULL END,
  "createdAt",
  "updatedAt"
FROM "Usuario"
WHERE "estado" IN ('PENDIENTE', 'RECHAZADO');
