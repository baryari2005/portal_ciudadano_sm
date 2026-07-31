CREATE TYPE "AccesoResultado" AS ENUM ('PERMITIDO', 'RECHAZADO');
CREATE TYPE "AccesoOrigen" AS ENUM ('QR', 'MANUAL');
CREATE TYPE "AccesoMotivo" AS ENUM ('USUARIO_HABILITADO', 'QR_INVALIDO', 'QR_REVOCADO', 'USUARIO_INACTIVO', 'USUARIO_ELIMINADO', 'SIN_INSCRIPCION', 'INSCRIPCION_NO_CONFIRMADA', 'SIN_CLASE_HABILITADA', 'FUERA_DE_HORARIO', 'CLASE_SUSPENDIDA', 'CLASE_CANCELADA', 'ESTABLECIMIENTO_INCORRECTO', 'ACCESO_MANUAL_AUTORIZADO', 'ACCESO_MANUAL_RECHAZADO');
ALTER TYPE "AuditoriaAccion" ADD VALUE 'ANULAR';
ALTER TYPE "AuditoriaEntidad" ADD VALUE 'REGISTRO_ACCESO';
CREATE TABLE "RegistroAcceso" (
  "id" TEXT NOT NULL, "usuarioId" UUID, "establecimientoId" TEXT NOT NULL,
  "claseActividadId" TEXT, "inscripcionId" TEXT, "resultado" "AccesoResultado" NOT NULL,
  "motivo" "AccesoMotivo" NOT NULL, "origen" "AccesoOrigen" NOT NULL,
  "registradoPorId" UUID, "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nombreSnapshot" TEXT, "documentoSnapshot" TEXT, "observaciones" TEXT,
  "anuladoAt" TIMESTAMP(3), "anuladoPorId" UUID, "motivoAnulacion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistroAcceso_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistroAcceso_usuarioId_idx" ON "RegistroAcceso"("usuarioId");
CREATE INDEX "RegistroAcceso_establecimientoId_idx" ON "RegistroAcceso"("establecimientoId");
CREATE INDEX "RegistroAcceso_resultado_idx" ON "RegistroAcceso"("resultado");
CREATE INDEX "RegistroAcceso_motivo_idx" ON "RegistroAcceso"("motivo");
CREATE INDEX "RegistroAcceso_origen_idx" ON "RegistroAcceso"("origen");
CREATE INDEX "RegistroAcceso_registradoPorId_idx" ON "RegistroAcceso"("registradoPorId");
CREATE INDEX "RegistroAcceso_fechaHora_idx" ON "RegistroAcceso"("fechaHora");
CREATE INDEX "RegistroAcceso_claseActividadId_idx" ON "RegistroAcceso"("claseActividadId");
CREATE INDEX "RegistroAcceso_inscripcionId_idx" ON "RegistroAcceso"("inscripcionId");
CREATE INDEX "RegistroAcceso_anuladoAt_idx" ON "RegistroAcceso"("anuladoAt");
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_establecimientoId_fkey" FOREIGN KEY ("establecimientoId") REFERENCES "Establecimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_claseActividadId_fkey" FOREIGN KEY ("claseActividadId") REFERENCES "ClaseActividad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegistroAcceso" ADD CONSTRAINT "RegistroAcceso_anuladoPorId_fkey" FOREIGN KEY ("anuladoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
