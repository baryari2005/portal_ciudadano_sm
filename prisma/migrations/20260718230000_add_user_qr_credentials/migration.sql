CREATE TYPE "UsuarioQrEstado" AS ENUM ('ACTIVO', 'REVOCADO');
CREATE TABLE "UsuarioQrCredencial" ("id" TEXT NOT NULL,"usuarioId" UUID NOT NULL,"tokenHash" TEXT NOT NULL,"estado" "UsuarioQrEstado" NOT NULL DEFAULT 'ACTIVO',"version" INTEGER NOT NULL DEFAULT 1,"emitidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"revocadoAt" TIMESTAMP(3),"ultimoUsoAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "UsuarioQrCredencial_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "UsuarioQrCredencial_tokenHash_key" ON "UsuarioQrCredencial"("tokenHash");
CREATE UNIQUE INDEX "UsuarioQrCredencial_one_active" ON "UsuarioQrCredencial"("usuarioId") WHERE "estado"='ACTIVO';
CREATE INDEX "UsuarioQrCredencial_usuarioId_idx" ON "UsuarioQrCredencial"("usuarioId");
CREATE INDEX "UsuarioQrCredencial_estado_idx" ON "UsuarioQrCredencial"("estado");
ALTER TABLE "UsuarioQrCredencial" ADD CONSTRAINT "UsuarioQrCredencial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
