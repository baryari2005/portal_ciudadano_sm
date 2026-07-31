CREATE TYPE "ProfesorEstado" AS ENUM ('ACTIVO', 'INACTIVO', 'SUSPENDIDO');

CREATE TABLE "Profesor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "especialidad" TEXT,
    "descripcion" TEXT,
    "matricula" TEXT,
    "fotoUrl" TEXT,
    "estado" "ProfesorEstado" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profesor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Profesor_usuarioId_key" ON "Profesor"("usuarioId");
CREATE INDEX "Profesor_estado_idx" ON "Profesor"("estado");
CREATE INDEX "Profesor_especialidad_idx" ON "Profesor"("especialidad");

ALTER TABLE "Profesor"
ADD CONSTRAINT "Profesor_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
