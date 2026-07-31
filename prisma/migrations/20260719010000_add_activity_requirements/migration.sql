CREATE TYPE "RequisitoTipo" AS ENUM ('INFORMACION', 'DOCUMENTO', 'CONSENTIMIENTO');

CREATE TABLE "Requisito" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nombre" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo" "RequisitoTipo" NOT NULL,
  "requiereDocumento" BOOLEAN NOT NULL DEFAULT false,
  "instrucciones" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Requisito_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActividadRequisito" (
  "id" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "requisitoId" UUID NOT NULL,
  "obligatorio" BOOLEAN NOT NULL DEFAULT true,
  "observaciones" TEXT,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActividadRequisito_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Requisito_slug_key" ON "Requisito"("slug");
CREATE INDEX "Requisito_nombre_idx" ON "Requisito"("nombre");
CREATE INDEX "Requisito_tipo_idx" ON "Requisito"("tipo");
CREATE INDEX "Requisito_activo_idx" ON "Requisito"("activo");
CREATE INDEX "Requisito_orden_idx" ON "Requisito"("orden");
CREATE UNIQUE INDEX "ActividadRequisito_actividadId_requisitoId_key" ON "ActividadRequisito"("actividadId", "requisitoId");
CREATE INDEX "ActividadRequisito_actividadId_idx" ON "ActividadRequisito"("actividadId");
CREATE INDEX "ActividadRequisito_requisitoId_idx" ON "ActividadRequisito"("requisitoId");
ALTER TABLE "ActividadRequisito" ADD CONSTRAINT "ActividadRequisito_actividadId_fkey" FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActividadRequisito" ADD CONSTRAINT "ActividadRequisito_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "Requisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
