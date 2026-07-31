-- Historical migration restored locally because it is already applied in the database.
-- This represents the base actividades/establecimientos schema present remotely.

CREATE TYPE "ActividadCategoria" AS ENUM ('EDUCACION', 'DEPORTE', 'SALUD', 'CULTURA', 'OFICIO', 'AMBIENTE', 'COMUNIDAD');
CREATE TYPE "ActividadEstado" AS ENUM ('BORRADOR', 'ACTIVA', 'INACTIVA', 'COMPLETA');
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');
CREATE TYPE "EstablecimientoTipo" AS ENUM ('PRINCIPAL', 'SEDE', 'PUNTO_ACTIVIDAD');

CREATE TABLE "Establecimiento" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "direccion" TEXT NOT NULL,
  "barrio" TEXT,
  "tipo" "EstablecimientoTipo" NOT NULL DEFAULT 'SEDE',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Establecimiento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Actividad" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "categoria" "ActividadCategoria" NOT NULL,
  "estado" "ActividadEstado" NOT NULL DEFAULT 'BORRADOR',
  "establecimientoId" TEXT NOT NULL,
  "responsableId" TEXT,
  "responsableNombre" TEXT,
  "cupoMaximo" INTEGER NOT NULL,
  "edadMinima" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActividadHorario" (
  "id" TEXT NOT NULL,
  "actividadId" TEXT NOT NULL,
  "dia" "DiaSemana" NOT NULL,
  "horaInicio" TEXT NOT NULL,
  "horaFin" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActividadHorario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Establecimiento_activo_idx" ON "Establecimiento"("activo");
CREATE INDEX "Establecimiento_tipo_idx" ON "Establecimiento"("tipo");
CREATE INDEX "Actividad_establecimientoId_idx" ON "Actividad"("establecimientoId");
CREATE INDEX "Actividad_categoria_idx" ON "Actividad"("categoria");
CREATE INDEX "Actividad_estado_idx" ON "Actividad"("estado");
CREATE INDEX "ActividadHorario_actividadId_idx" ON "ActividadHorario"("actividadId");
CREATE INDEX "ActividadHorario_dia_idx" ON "ActividadHorario"("dia");
