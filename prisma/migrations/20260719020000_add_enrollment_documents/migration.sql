CREATE TYPE "DocumentoInscripcionEstado" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');
CREATE TABLE "DocumentoInscripcion" (
  "id" TEXT NOT NULL,
  "inscripcionId" TEXT NOT NULL,
  "requisitoId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "estado" "DocumentoInscripcionEstado" NOT NULL DEFAULT 'PENDIENTE',
  "nombreOriginal" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "extension" TEXT,
  "tamanioBytes" INTEGER NOT NULL,
  "sha256" TEXT,
  "requisitoNombreSnapshot" TEXT NOT NULL,
  "obligatorioSnapshot" BOOLEAN NOT NULL,
  "instruccionesSnapshot" TEXT,
  "observacionesCiudadano" TEXT,
  "motivoRechazo" TEXT,
  "observacionesRevision" TEXT,
  "subidoPorId" UUID NOT NULL,
  "revisadoPorId" UUID,
  "subidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revisadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentoInscripcion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentoInscripcion_inscripcionId_requisitoId_version_key" ON "DocumentoInscripcion"("inscripcionId", "requisitoId", "version");
CREATE INDEX "DocumentoInscripcion_inscripcionId_idx" ON "DocumentoInscripcion"("inscripcionId");
CREATE INDEX "DocumentoInscripcion_requisitoId_idx" ON "DocumentoInscripcion"("requisitoId");
CREATE INDEX "DocumentoInscripcion_estado_idx" ON "DocumentoInscripcion"("estado");
CREATE INDEX "DocumentoInscripcion_subidoAt_idx" ON "DocumentoInscripcion"("subidoAt");
CREATE INDEX "DocumentoInscripcion_revisadoAt_idx" ON "DocumentoInscripcion"("revisadoAt");
ALTER TABLE "DocumentoInscripcion" ADD CONSTRAINT "DocumentoInscripcion_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "Inscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoInscripcion" ADD CONSTRAINT "DocumentoInscripcion_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "Requisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoInscripcion" ADD CONSTRAINT "DocumentoInscripcion_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoInscripcion" ADD CONSTRAINT "DocumentoInscripcion_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
