-- CreateEnum
CREATE TYPE "ActividadNivel" AS ENUM ('INICIAL', 'INTERMEDIO', 'AVANZADO');

-- AlterTable
ALTER TABLE "Actividad"
ADD COLUMN "descripcionCorta" TEXT,
ADD COLUMN "imagenUrl" TEXT,
ADD COLUMN "color" TEXT,
ADD COLUMN "nivel" "ActividadNivel",
ADD COLUMN "edadMaxima" INTEGER,
ADD COLUMN "requiereCertificadoMedico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "requiereAutorizacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "esGratuita" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "precio" DECIMAL(12,2);
