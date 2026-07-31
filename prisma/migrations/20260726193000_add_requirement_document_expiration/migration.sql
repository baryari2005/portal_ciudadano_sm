ALTER TABLE "Requisito"
ADD COLUMN "tieneVencimiento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "vigenciaDias" INTEGER,
ADD COLUMN "diasAvisoVencimiento" INTEGER NOT NULL DEFAULT 30;

ALTER TABLE "Requisito"
ADD CONSTRAINT "Requisito_vigenciaDias_check"
CHECK ("vigenciaDias" IS NULL OR "vigenciaDias" > 0),
ADD CONSTRAINT "Requisito_diasAvisoVencimiento_check"
CHECK ("diasAvisoVencimiento" >= 0);
