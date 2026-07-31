CREATE TYPE "ModalidadInscripcion" AS ENUM ('PERMANENTE', 'POR_PERIODO', 'POR_CLASE');
CREATE TYPE "ReservaClaseEstado" AS ENUM ('RESERVADA', 'LISTA_ESPERA', 'OFRECIDA', 'CANCELADA', 'AUSENCIA_INFORMADA');
CREATE TYPE "EstadoParticipacion" AS ENUM ('HABILITADO', 'EN_REVISION', 'SUSPENDIDO_PROVISORIO');

ALTER TABLE "Usuario"
  ADD COLUMN "estadoParticipacion" "EstadoParticipacion" NOT NULL DEFAULT 'HABILITADO',
  ADD COLUMN "umbralAusenciasJustificadas" INTEGER,
  ADD COLUMN "umbralAusenciasInjustificadas" INTEGER,
  ADD COLUMN "participacionRevisadaAt" TIMESTAMP(3),
  ADD COLUMN "participacionObservaciones" TEXT;

ALTER TABLE "Actividad"
  ADD COLUMN "modalidadInscripcion" "ModalidadInscripcion" NOT NULL DEFAULT 'PERMANENTE',
  ADD COLUMN "duracionPeriodoMeses" INTEGER,
  ADD COLUMN "horasCancelacionJustificada" INTEGER NOT NULL DEFAULT 24;

ALTER TABLE "ClaseActividad"
  ADD COLUMN "cupoMaximo" INTEGER,
  ADD COLUMN "motivoCancelacion" TEXT;

ALTER TABLE "Inscripcion"
  ADD COLUMN "modalidad" "ModalidadInscripcion" NOT NULL DEFAULT 'PERMANENTE',
  ADD COLUMN "fechaInicio" DATE,
  ADD COLUMN "fechaFin" DATE;

CREATE TABLE "ReservaClase" (
  "id" TEXT NOT NULL,
  "claseActividadId" TEXT NOT NULL,
  "usuarioId" UUID NOT NULL,
  "inscripcionId" TEXT,
  "estado" "ReservaClaseEstado" NOT NULL DEFAULT 'RESERVADA',
  "confirmadoAt" TIMESTAMP(3),
  "ofrecidoAt" TIMESTAMP(3),
  "ofertaVenceAt" TIMESTAMP(3),
  "canceladoAt" TIMESTAMP(3),
  "motivoCancelacion" TEXT,
  "cancelacionJustificada" BOOLEAN,
  "comprobanteUrl" TEXT,
  "posicionEsperaAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReservaClase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReservaClase_claseActividadId_usuarioId_key" ON "ReservaClase"("claseActividadId", "usuarioId");
CREATE INDEX "ReservaClase_claseActividadId_estado_idx" ON "ReservaClase"("claseActividadId", "estado");
CREATE INDEX "ReservaClase_usuarioId_estado_idx" ON "ReservaClase"("usuarioId", "estado");
CREATE INDEX "ReservaClase_inscripcionId_idx" ON "ReservaClase"("inscripcionId");
CREATE INDEX "ReservaClase_ofertaVenceAt_idx" ON "ReservaClase"("ofertaVenceAt");
