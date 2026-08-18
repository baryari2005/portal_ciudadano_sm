ALTER TABLE "Establecimiento"
ADD COLUMN "direccionPlaceId" TEXT,
ADD COLUMN "direccionLat" DOUBLE PRECISION,
ADD COLUMN "direccionLng" DOUBLE PRECISION;
ALTER TABLE "Establecimiento" ADD COLUMN "codigoPostal" TEXT;

CREATE INDEX "Establecimiento_direccionPlaceId_idx" ON "Establecimiento"("direccionPlaceId");
