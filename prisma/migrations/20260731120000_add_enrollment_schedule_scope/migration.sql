CREATE TABLE "InscripcionHorario" (
    "id" TEXT NOT NULL,
    "inscripcionId" TEXT NOT NULL,
    "horarioActividadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InscripcionHorario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InscripcionHorario_inscripcionId_horarioActividadId_key"
ON "InscripcionHorario"("inscripcionId", "horarioActividadId");

CREATE INDEX "InscripcionHorario_horarioActividadId_idx"
ON "InscripcionHorario"("horarioActividadId");

ALTER TABLE "InscripcionHorario"
ADD CONSTRAINT "InscripcionHorario_inscripcionId_fkey"
FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InscripcionHorario"
ADD CONSTRAINT "InscripcionHorario_horarioActividadId_fkey"
FOREIGN KEY ("horarioActividadId") REFERENCES "ActividadHorario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "InscripcionHorario" ("id", "inscripcionId", "horarioActividadId", "createdAt")
SELECT CONCAT('scope_', "id"), "id", "horarioActividadId", CURRENT_TIMESTAMP
FROM "Inscripcion";
