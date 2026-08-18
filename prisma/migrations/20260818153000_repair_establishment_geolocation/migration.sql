ALTER TABLE "Establecimiento"
ADD COLUMN IF NOT EXISTS "direccionPlaceId" TEXT,
ADD COLUMN IF NOT EXISTS "direccionLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "direccionLng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "codigoPostal" TEXT;

CREATE INDEX IF NOT EXISTS "Establecimiento_direccionPlaceId_idx"
ON "Establecimiento"("direccionPlaceId");
