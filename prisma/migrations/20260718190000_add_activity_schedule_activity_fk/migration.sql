ALTER TABLE "ActividadHorario"
  ADD CONSTRAINT "ActividadHorario_actividadId_fkey"
  FOREIGN KEY ("actividadId") REFERENCES "Actividad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
