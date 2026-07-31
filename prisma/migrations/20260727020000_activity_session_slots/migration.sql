DROP INDEX IF EXISTS "ClaseActividad_horarioActividadId_fecha_key";
CREATE UNIQUE INDEX "ClaseActividad_horarioActividadId_fecha_horaInicio_key" ON "ClaseActividad"("horarioActividadId", "fecha", "horaInicio");
