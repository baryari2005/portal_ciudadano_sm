CREATE TYPE "EstadoUsuario" AS ENUM ('PENDIENTE', 'ACTIVO', 'RECHAZADO', 'BLOQUEADO');

ALTER TABLE "Usuario"
  ALTER COLUMN "password" DROP NOT NULL,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerId" TEXT,
  ADD COLUMN "perfilCompleto" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "estado" "EstadoUsuario" NOT NULL DEFAULT 'ACTIVO';

ALTER TABLE "PasswordResetToken"
  ALTER COLUMN "userId" TYPE UUID USING "userId"::uuid;

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "Usuario_estado_idx" ON "Usuario"("estado");
CREATE INDEX "Usuario_perfilCompleto_idx" ON "Usuario"("perfilCompleto");
CREATE INDEX "Usuario_provider_providerId_idx" ON "Usuario"("provider", "providerId");
