CREATE TYPE "HorarioActividadEstado" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'CANCELADO', 'FINALIZADO');

ALTER TABLE "ActividadHorario"
  ADD COLUMN "establecimientoId" TEXT,
  ADD COLUMN "espacio" TEXT,
  ADD COLUMN "observaciones" TEXT,
  ADD COLUMN "cupoMaximo" INTEGER,
  ADD COLUMN "permiteListaEspera" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "permiteSobrecupo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sobrecupoMaximo" INTEGER,
  ADD COLUMN "estado" "HorarioActividadEstado" NOT NULL DEFAULT 'ACTIVO';

UPDATE "ActividadHorario" AS horario
SET "establecimientoId" = actividad."establecimientoId",
    "cupoMaximo" = GREATEST(COALESCE(actividad."cupoMaximo", actividad."cupo", 1), 1)
FROM "Actividad" AS actividad
WHERE horario."actividadId" = actividad."id"
  AND (horario."establecimientoId" IS NULL OR horario."cupoMaximo" IS NULL);

ALTER TABLE "ActividadHorario"
  ALTER COLUMN "establecimientoId" SET NOT NULL,
  ALTER COLUMN "cupoMaximo" SET NOT NULL;

CREATE TABLE "ActividadHorarioProfesor" (
  "id" TEXT NOT NULL,
  "horarioActividadId" TEXT NOT NULL,
  "profesorId" UUID NOT NULL,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActividadHorarioProfesor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActividadHorarioProfesor_horarioActividadId_profesorId_key"
  ON "ActividadHorarioProfesor"("horarioActividadId", "profesorId");
CREATE UNIQUE INDEX "ActividadHorarioProfesor_one_primary"
  ON "ActividadHorarioProfesor"("horarioActividadId") WHERE "esPrincipal" = true;
CREATE INDEX "ActividadHorarioProfesor_horarioActividadId_idx" ON "ActividadHorarioProfesor"("horarioActividadId");
CREATE INDEX "ActividadHorarioProfesor_profesorId_idx" ON "ActividadHorarioProfesor"("profesorId");
CREATE INDEX "ActividadHorario_establecimientoId_idx" ON "ActividadHorario"("establecimientoId");
CREATE INDEX "ActividadHorario_estado_idx" ON "ActividadHorario"("estado");

ALTER TABLE "ActividadHorario"
  ADD CONSTRAINT "ActividadHorario_establecimientoId_fkey"
  FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActividadHorarioProfesor"
  ADD CONSTRAINT "ActividadHorarioProfesor_horarioActividadId_fkey"
  FOREIGN KEY ("horarioActividadId") REFERENCES "ActividadHorario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActividadHorarioProfesor"
  ADD CONSTRAINT "ActividadHorarioProfesor_profesorId_fkey"
  FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActividadHorario"
  ADD CONSTRAINT "ActividadHorario_cupoMaximo_check" CHECK ("cupoMaximo" > 0),
  ADD CONSTRAINT "ActividadHorario_sobrecupoMaximo_check"
    CHECK ((NOT "permiteSobrecupo" AND "sobrecupoMaximo" IS NULL) OR ("permiteSobrecupo" AND "sobrecupoMaximo" > 0));

INSERT INTO "Permiso" ("modulo", "accion", "nombre", "descripcion", "activo", "createdAt", "updatedAt")
VALUES
  ('activity_schedules', 'ver', 'activity_schedules:ver', 'Permite visualizar horarios de actividades.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('activity_schedules', 'crear', 'activity_schedules:crear', 'Permite crear horarios de actividades.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('activity_schedules', 'editar', 'activity_schedules:editar', 'Permite editar horarios de actividades.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('activity_schedules', 'eliminar', 'activity_schedules:eliminar', 'Permite cambiar el estado de horarios de actividades.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('activity_schedules', 'asignar', 'activity_schedules:asignar', 'Permite asignar sedes y profesores a horarios.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("modulo", "accion") DO UPDATE
SET "nombre" = EXCLUDED."nombre", "descripcion" = EXCLUDED."descripcion", "activo" = true, "updatedAt" = CURRENT_TIMESTAMP;
