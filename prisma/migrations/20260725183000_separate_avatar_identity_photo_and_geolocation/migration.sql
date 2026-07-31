ALTER TABLE "Usuario"
ADD COLUMN "fotoPerfilUrl" TEXT,
ADD COLUMN "domicilioPlaceId" TEXT,
ADD COLUMN "domicilioLat" DOUBLE PRECISION,
ADD COLUMN "domicilioLng" DOUBLE PRECISION;

-- La imagen existente se conserva como avatar y también pasa a ser la
-- referencia visual de identidad hasta que se cargue una foto específica.
UPDATE "Usuario"
SET "fotoPerfilUrl" = "avatarUrl"
WHERE "avatarUrl" IS NOT NULL;

CREATE INDEX "Usuario_domicilioPlaceId_idx" ON "Usuario"("domicilioPlaceId");
