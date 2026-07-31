CREATE TABLE "ActividadBorrador" (
  "id" TEXT NOT NULL,
  "creadoPorId" UUID NOT NULL,
  "actividadId" TEXT,
  "nombre" TEXT NOT NULL DEFAULT 'Actividad sin nombre',
  "modalidad" "ActividadModalidad",
  "pasoActual" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'INCOMPLETO',
  "publicadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ActividadBorrador_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ActividadBorrador_actividadId_key" ON "ActividadBorrador"("actividadId");
CREATE INDEX "ActividadBorrador_creadoPorId_idx" ON "ActividadBorrador"("creadoPorId");
CREATE INDEX "ActividadBorrador_estado_idx" ON "ActividadBorrador"("estado");
CREATE INDEX "ActividadBorrador_updatedAt_idx" ON "ActividadBorrador"("updatedAt");
