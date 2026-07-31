-- CreateEnum
CREATE TYPE "AccesoQrDigitalEstado" AS ENUM ('ACTIVO', 'CONSUMIDO', 'REVOCADO');

-- AlterEnum
ALTER TYPE "AccesoOrigen" ADD VALUE IF NOT EXISTS 'QR_DIGITAL';
ALTER TYPE "AccesoOrigen" ADD VALUE IF NOT EXISTS 'CARNET_FISICO';

-- AlterEnum
ALTER TYPE "AccesoMotivo" ADD VALUE IF NOT EXISTS 'QR_USADO';

-- CreateTable
CREATE TABLE "AccesoQrDigital" (
    "id" TEXT NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "estado" "AccesoQrDigitalEstado" NOT NULL DEFAULT 'ACTIVO',
    "emitidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumidoAt" TIMESTAMP(3),
    "revocadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccesoQrDigital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccesoQrDigital_tokenHash_key" ON "AccesoQrDigital"("tokenHash");

-- CreateIndex
CREATE INDEX "AccesoQrDigital_usuarioId_idx" ON "AccesoQrDigital"("usuarioId");

-- CreateIndex
CREATE INDEX "AccesoQrDigital_estado_idx" ON "AccesoQrDigital"("estado");

-- AddForeignKey
ALTER TABLE "AccesoQrDigital" ADD CONSTRAINT "AccesoQrDigital_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
