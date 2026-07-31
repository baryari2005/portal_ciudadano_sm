-- El proyecto está en desarrollo: se reemplaza el modelo anterior sin preservar notificaciones de prueba.
DROP TABLE IF EXISTS "Notificacion" CASCADE;

CREATE TYPE "NotificacionAudiencia" AS ENUM ('INDIVIDUAL', 'MASIVA', 'ROL');
CREATE TYPE "NotificacionOrigen" AS ENUM ('INDIVIDUAL', 'MASIVA', 'ROL');
CREATE TYPE "NotificacionGestionEstado" AS ENUM ('INFORMATIVA', 'ABIERTA', 'EN_TRATAMIENTO', 'RESUELTA', 'CANCELADA');

CREATE TABLE "Notificacion" (
  "id" TEXT NOT NULL,
  "emisorId" UUID,
  "audiencia" "NotificacionAudiencia" NOT NULL DEFAULT 'INDIVIDUAL',
  "rolDestinatarioId" INTEGER,
  "tipo" "NotificacionTipo" NOT NULL,
  "titulo" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "prioridad" "NotificacionPrioridad" NOT NULL DEFAULT 'NORMAL',
  "estadoGestion" "NotificacionGestionEstado" NOT NULL DEFAULT 'INFORMATIVA',
  "gestionadaPorId" UUID,
  "gestionadaAt" TIMESTAMP(3),
  "resultadoGestion" TEXT,
  "actionUrl" TEXT,
  "actionLabel" TEXT,
  "entidadTipo" TEXT,
  "entidadId" TEXT,
  "metadata" JSONB,
  "deduplicationKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntregaNotificacion" (
  "id" TEXT NOT NULL,
  "notificacionId" TEXT NOT NULL,
  "usuarioId" UUID NOT NULL,
  "origen" "NotificacionOrigen" NOT NULL DEFAULT 'INDIVIDUAL',
  "estado" "NotificacionEstado" NOT NULL DEFAULT 'NO_LEIDA',
  "leidaAt" TIMESTAMP(3),
  "archivadaAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EntregaNotificacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notificacion_deduplicationKey_key" ON "Notificacion"("deduplicationKey");
CREATE UNIQUE INDEX "EntregaNotificacion_notificacionId_usuarioId_key" ON "EntregaNotificacion"("notificacionId", "usuarioId");
CREATE INDEX "EntregaNotificacion_usuarioId_estado_idx" ON "EntregaNotificacion"("usuarioId", "estado");
CREATE INDEX "EntregaNotificacion_notificacionId_idx" ON "EntregaNotificacion"("notificacionId");
CREATE INDEX "EntregaNotificacion_origen_idx" ON "EntregaNotificacion"("origen");
CREATE INDEX "Notificacion_emisorId_idx" ON "Notificacion"("emisorId");
CREATE INDEX "Notificacion_audiencia_idx" ON "Notificacion"("audiencia");
CREATE INDEX "Notificacion_rolDestinatarioId_idx" ON "Notificacion"("rolDestinatarioId");
CREATE INDEX "Notificacion_estadoGestion_idx" ON "Notificacion"("estadoGestion");
CREATE INDEX "Notificacion_tipo_idx" ON "Notificacion"("tipo");
CREATE INDEX "Notificacion_prioridad_idx" ON "Notificacion"("prioridad");
CREATE INDEX "Notificacion_createdAt_idx" ON "Notificacion"("createdAt");

ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_rolDestinatarioId_fkey" FOREIGN KEY ("rolDestinatarioId") REFERENCES "Rol"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_gestionadaPorId_fkey" FOREIGN KEY ("gestionadaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EntregaNotificacion" ADD CONSTRAINT "EntregaNotificacion_notificacionId_fkey" FOREIGN KEY ("notificacionId") REFERENCES "Notificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntregaNotificacion" ADD CONSTRAINT "EntregaNotificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
