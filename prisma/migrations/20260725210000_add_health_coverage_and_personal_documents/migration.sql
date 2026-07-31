CREATE TYPE "CoberturaMedicaTipo" AS ENUM ('OBRA_SOCIAL', 'PREPAGA');

CREATE TABLE "CoberturaMedica" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "nombre" TEXT NOT NULL,
  "tipo" "CoberturaMedicaTipo" NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoberturaMedica_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CoberturaMedica_nombre_key" ON "CoberturaMedica"("nombre");
CREATE INDEX "CoberturaMedica_nombre_idx" ON "CoberturaMedica"("nombre");
CREATE INDEX "CoberturaMedica_tipo_idx" ON "CoberturaMedica"("tipo");
CREATE INDEX "CoberturaMedica_activo_idx" ON "CoberturaMedica"("activo");

ALTER TABLE "Usuario"
ADD COLUMN "contactoEmergenciaNombre" TEXT,
ADD COLUMN "contactoEmergenciaTelefono" TEXT,
ADD COLUMN "coberturaMedicaId" UUID,
ADD COLUMN "numeroAfiliado" TEXT;
CREATE INDEX "Usuario_coberturaMedicaId_idx" ON "Usuario"("coberturaMedicaId");
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_coberturaMedicaId_fkey" FOREIGN KEY ("coberturaMedicaId") REFERENCES "CoberturaMedica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Requisito" ADD COLUMN "documentoPersonal" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DocumentoUsuario" (
  "id" TEXT NOT NULL,
  "usuarioId" UUID NOT NULL,
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
  "instruccionesSnapshot" TEXT,
  "observacionesCiudadano" TEXT,
  "motivoRechazo" TEXT,
  "observacionesRevision" TEXT,
  "fechaVencimiento" DATE,
  "subidoPorId" UUID NOT NULL,
  "revisadoPorId" UUID,
  "subidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revisadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentoUsuario_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentoUsuario_usuarioId_requisitoId_version_key" ON "DocumentoUsuario"("usuarioId", "requisitoId", "version");
CREATE INDEX "DocumentoUsuario_usuarioId_idx" ON "DocumentoUsuario"("usuarioId");
CREATE INDEX "DocumentoUsuario_requisitoId_idx" ON "DocumentoUsuario"("requisitoId");
CREATE INDEX "DocumentoUsuario_estado_idx" ON "DocumentoUsuario"("estado");
CREATE INDEX "DocumentoUsuario_subidoAt_idx" ON "DocumentoUsuario"("subidoAt");
ALTER TABLE "DocumentoUsuario" ADD CONSTRAINT "DocumentoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoUsuario" ADD CONSTRAINT "DocumentoUsuario_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "Requisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoUsuario" ADD CONSTRAINT "DocumentoUsuario_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoUsuario" ADD CONSTRAINT "DocumentoUsuario_revisadoPorId_fkey" FOREIGN KEY ("revisadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
