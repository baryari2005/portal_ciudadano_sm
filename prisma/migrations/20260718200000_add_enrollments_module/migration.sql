CREATE TYPE "InscripcionEstado" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'LISTA_ESPERA', 'CANCELADA', 'RECHAZADA', 'BAJA');

CREATE TABLE "Inscripcion" (
  "id" TEXT NOT NULL,
  "usuarioId" UUID NOT NULL,
  "horarioActividadId" TEXT NOT NULL,
  "estado" "InscripcionEstado" NOT NULL DEFAULT 'PENDIENTE',
  "fechaInscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fechaConfirmacion" TIMESTAMP(3),
  "fechaListaEspera" TIMESTAMP(3),
  "fechaCancelacion" TIMESTAMP(3),
  "motivoRechazo" TEXT,
  "motivoCancelacion" TEXT,
  "observaciones" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inscripcion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Inscripcion_usuarioId_horarioActividadId_key" ON "Inscripcion"("usuarioId", "horarioActividadId");
CREATE INDEX "Inscripcion_usuarioId_idx" ON "Inscripcion"("usuarioId");
CREATE INDEX "Inscripcion_horarioActividadId_idx" ON "Inscripcion"("horarioActividadId");
CREATE INDEX "Inscripcion_estado_idx" ON "Inscripcion"("estado");
CREATE INDEX "Inscripcion_fechaInscripcion_idx" ON "Inscripcion"("fechaInscripcion");
CREATE INDEX "Inscripcion_fechaListaEspera_idx" ON "Inscripcion"("fechaListaEspera");

ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Inscripcion" ADD CONSTRAINT "Inscripcion_horarioActividadId_fkey" FOREIGN KEY ("horarioActividadId") REFERENCES "ActividadHorario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "Permiso" ("modulo", "accion", "nombre", "descripcion", "activo", "createdAt", "updatedAt")
VALUES
  ('enrollments', 'ver', 'enrollments:ver', 'Permite visualizar inscripciones.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('enrollments', 'crear', 'enrollments:crear', 'Permite crear inscripciones.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('enrollments', 'editar', 'enrollments:editar', 'Permite editar inscripciones.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('enrollments', 'eliminar', 'enrollments:eliminar', 'Permite cancelar, rechazar o dar de baja inscripciones.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('enrollments', 'asignar', 'enrollments:asignar', 'Permite administrar confirmaciones y lista de espera.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("modulo", "accion") DO UPDATE SET "nombre" = EXCLUDED."nombre", "descripcion" = EXCLUDED."descripcion", "activo" = true, "updatedAt" = CURRENT_TIMESTAMP;
