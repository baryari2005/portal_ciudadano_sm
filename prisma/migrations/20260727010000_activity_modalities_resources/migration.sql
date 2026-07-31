ALTER TYPE "RequisitoTipo" ADD VALUE IF NOT EXISTS 'ELEMENTO_PERSONAL';
ALTER TYPE "RequisitoTipo" ADD VALUE IF NOT EXISTS 'CONDICION';

CREATE TYPE "RequisitoObligatoriedad" AS ENUM ('OBLIGATORIO', 'RECOMENDADO');
CREATE TYPE "ActividadModalidad" AS ENUM ('HORARIO_FIJO', 'TURNO_RECURRENTE', 'TURNO_PUNTUAL', 'ACCESO_LIBRE', 'EVENTO_UNICO', 'CURSO_PERIODO');
CREATE TYPE "VigenciaReserva" AS ENUM ('INDEFINIDA', 'MENSUAL', 'PERIODO_DEFINIDO', 'UNICA');
CREATE TYPE "RecursoTipo" AS ENUM ('ESPACIO', 'CANCHA', 'EQUIPAMIENTO', 'COMPUTADORA', 'ANDARIVEL', 'OTRO');
CREATE TYPE "RecursoModoReserva" AS ENUM ('CAPACIDAD', 'ESPECIFICO', 'EXCLUSIVO');
CREATE TYPE "RecursoEstado" AS ENUM ('ACTIVO', 'MANTENIMIENTO', 'INACTIVO');
CREATE TYPE "EstrategiaAsignacionRecurso" AS ENUM ('AUTOMATICA', 'ELEGIDA_USUARIO', 'AL_INGRESAR');
CREATE TYPE "ReservaRecursoEstado" AS ENUM ('RESERVADA', 'ASIGNADA', 'UTILIZADA', 'CANCELADA');
CREATE TYPE "BloqueoRecursoOrigen" AS ENUM ('MANUAL', 'CLASE', 'MANTENIMIENTO');

ALTER TABLE "Actividad"
  ADD COLUMN "modalidadOperacion" "ActividadModalidad" NOT NULL DEFAULT 'HORARIO_FIJO',
  ADD COLUMN "vigenciaReserva" "VigenciaReserva" NOT NULL DEFAULT 'INDEFINIDA',
  ADD COLUMN "duracionTurnoMinutos" INTEGER,
  ADD COLUMN "intervaloTurnoMinutos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "anticipacionReservaDias" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "limiteReservasPorUsuario" INTEGER,
  ADD COLUMN "requiereReserva" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Requisito"
  ADD COLUMN "obligatoriedad" "RequisitoObligatoriedad" NOT NULL DEFAULT 'OBLIGATORIO',
  ADD COLUMN "provistoPorInstitucion" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiereConfirmacion" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "controlarAlIngreso" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "aplicaEnCadaClase" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ActividadHorario"
  ADD COLUMN "duracionTurnoMinutos" INTEGER,
  ADD COLUMN "intervaloTurnoMinutos" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Recurso" (
  "id" TEXT NOT NULL,
  "establecimientoId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo" "RecursoTipo" NOT NULL,
  "modoReserva" "RecursoModoReserva" NOT NULL DEFAULT 'CAPACIDAD',
  "capacidadUnidades" INTEGER NOT NULL DEFAULT 1,
  "estado" "RecursoEstado" NOT NULL DEFAULT 'ACTIVO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Recurso_establecimientoId_codigo_key" ON "Recurso"("establecimientoId", "codigo");
CREATE INDEX "Recurso_establecimientoId_tipo_estado_idx" ON "Recurso"("establecimientoId", "tipo", "estado");

CREATE TABLE "ActividadRecurso" (
  "id" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "recursoId" TEXT NOT NULL,
  "cantidadNecesaria" INTEGER NOT NULL DEFAULT 1,
  "estrategiaAsignacion" "EstrategiaAsignacionRecurso" NOT NULL DEFAULT 'AL_INGRESAR',
  "exclusivo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActividadRecurso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActividadRecurso_actividadId_recursoId_key" ON "ActividadRecurso"("actividadId", "recursoId");
CREATE INDEX "ActividadRecurso_recursoId_idx" ON "ActividadRecurso"("recursoId");

CREATE TABLE "HorarioActividadRecurso" (
  "id" TEXT NOT NULL,
  "horarioActividadId" TEXT NOT NULL,
  "recursoId" TEXT NOT NULL,
  "cantidadReservada" INTEGER NOT NULL DEFAULT 1,
  "estrategiaAsignacion" "EstrategiaAsignacionRecurso" NOT NULL DEFAULT 'AL_INGRESAR',
  "exclusivo" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HorarioActividadRecurso_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "HorarioActividadRecurso_horarioActividadId_recursoId_key" ON "HorarioActividadRecurso"("horarioActividadId", "recursoId");
CREATE INDEX "HorarioActividadRecurso_recursoId_idx" ON "HorarioActividadRecurso"("recursoId");

CREATE TABLE "ReservaRecurso" (
  "id" TEXT NOT NULL,
  "recursoId" TEXT NOT NULL,
  "reservaClaseId" TEXT,
  "usuarioId" UUID,
  "fecha" DATE NOT NULL,
  "horaInicio" TEXT NOT NULL,
  "horaFin" TEXT NOT NULL,
  "cantidad" INTEGER NOT NULL DEFAULT 1,
  "estado" "ReservaRecursoEstado" NOT NULL DEFAULT 'RESERVADA',
  "asignadoAlIngresar" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReservaRecurso_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReservaRecurso_recursoId_fecha_horaInicio_horaFin_estado_idx" ON "ReservaRecurso"("recursoId", "fecha", "horaInicio", "horaFin", "estado");
CREATE INDEX "ReservaRecurso_reservaClaseId_idx" ON "ReservaRecurso"("reservaClaseId");
CREATE INDEX "ReservaRecurso_usuarioId_idx" ON "ReservaRecurso"("usuarioId");

CREATE TABLE "BloqueoRecurso" (
  "id" TEXT NOT NULL,
  "recursoId" TEXT NOT NULL,
  "claseActividadId" TEXT,
  "fecha" DATE NOT NULL,
  "horaInicio" TEXT NOT NULL,
  "horaFin" TEXT NOT NULL,
  "cantidad" INTEGER NOT NULL DEFAULT 1,
  "motivo" TEXT NOT NULL,
  "origen" "BloqueoRecursoOrigen" NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BloqueoRecurso_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BloqueoRecurso_recursoId_fecha_horaInicio_horaFin_idx" ON "BloqueoRecurso"("recursoId", "fecha", "horaInicio", "horaFin");
CREATE INDEX "BloqueoRecurso_claseActividadId_idx" ON "BloqueoRecurso"("claseActividadId");
