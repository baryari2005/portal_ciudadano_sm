-- Relate activities to the administrative catalogs without removing legacy fields.

ALTER TABLE "Actividad"
ADD COLUMN "categoriaActividadId" UUID;

CREATE TABLE "ActividadPublicoObjetivo" (
  "id" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "publicoObjetivoId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ActividadPublicoObjetivo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Actividad_categoriaActividadId_idx"
ON "Actividad"("categoriaActividadId");

CREATE UNIQUE INDEX "ActividadPublicoObjetivo_actividadId_publicoObjetivoId_key"
ON "ActividadPublicoObjetivo"("actividadId", "publicoObjetivoId");

CREATE INDEX "ActividadPublicoObjetivo_actividadId_idx"
ON "ActividadPublicoObjetivo"("actividadId");

CREATE INDEX "ActividadPublicoObjetivo_publicoObjetivoId_idx"
ON "ActividadPublicoObjetivo"("publicoObjetivoId");

ALTER TABLE "Actividad"
ADD CONSTRAINT "Actividad_categoriaActividadId_fkey"
FOREIGN KEY ("categoriaActividadId") REFERENCES "CategoriaActividad"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActividadPublicoObjetivo"
ADD CONSTRAINT "ActividadPublicoObjetivo_actividadId_fkey"
FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActividadPublicoObjetivo"
ADD CONSTRAINT "ActividadPublicoObjetivo_publicoObjetivoId_fkey"
FOREIGN KEY ("publicoObjetivoId") REFERENCES "PublicoObjetivo"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
