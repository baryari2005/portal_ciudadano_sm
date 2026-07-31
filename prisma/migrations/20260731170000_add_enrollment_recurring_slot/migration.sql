ALTER TABLE "InscripcionHorario" ADD COLUMN "horaInicio" TEXT;
ALTER TABLE "InscripcionHorario" ADD COLUMN "horaFin" TEXT;
DROP INDEX IF EXISTS "InscripcionHorario_inscripcionId_horarioActividadId_key";
CREATE UNIQUE INDEX "InscripcionHorario_inscripcionId_horarioActividadId_horaInicio_key"
ON "InscripcionHorario"("inscripcionId", "horarioActividadId", "horaInicio");
