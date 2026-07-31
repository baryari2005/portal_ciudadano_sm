ALTER TABLE "Rol" ADD COLUMN "codigo" TEXT;

UPDATE "Rol"
SET "codigo" = CASE lower(trim("nombre"))
  WHEN 'recepcion' THEN 'reception'
  WHEN 'profesor' THEN 'teacher'
  WHEN 'user' THEN 'citizen'
  ELSE lower(regexp_replace(trim("nombre"), '[^a-zA-Z0-9]+', '_', 'g'))
END;

ALTER TABLE "Rol" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX "Rol_codigo_key" ON "Rol"("codigo");
