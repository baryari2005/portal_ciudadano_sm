-- Ensure the canonical unrestricted audience exists before backfilling activities.
INSERT INTO "PublicoObjetivo" (
  "id",
  "nombre",
  "slug",
  "descripcion",
  "edadMinimaSugerida",
  "edadMaximaSugerida",
  "orden",
  "activo",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'Familia',
  'familia',
  'Actividades orientadas al grupo familiar.',
  NULL,
  NULL,
  50,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

-- Persist the fixed age ranges in the existing target-audience fields.
UPDATE "PublicoObjetivo"
SET
  "edadMinimaSugerida" = CASE "slug"
    WHEN 'ninos' THEN 0
    WHEN 'adolescentes' THEN 13
    WHEN 'adultos' THEN 18
    WHEN 'adultos-mayores' THEN 60
    WHEN 'familia' THEN NULL
  END,
  "edadMaximaSugerida" = CASE "slug"
    WHEN 'ninos' THEN 12
    WHEN 'adolescentes' THEN 17
    WHEN 'adultos' THEN 59
    WHEN 'adultos-mayores' THEN NULL
    WHEN 'familia' THEN NULL
  END,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" IN (
  'ninos',
  'adolescentes',
  'adultos',
  'adultos-mayores',
  'familia'
);

-- Assign Familia only to activities that currently have no target audience.
INSERT INTO "ActividadPublicoObjetivo" (
  "id",
  "actividadId",
  "publicoObjetivoId",
  "createdAt"
)
SELECT
  gen_random_uuid()::text,
  actividad."id",
  familia."id",
  CURRENT_TIMESTAMP
FROM "Actividad" AS actividad
CROSS JOIN "PublicoObjetivo" AS familia
WHERE familia."slug" = 'familia'
  AND NOT EXISTS (
    SELECT 1
    FROM "ActividadPublicoObjetivo" AS relacion
    WHERE relacion."actividadId" = actividad."id"
  )
ON CONFLICT ("actividadId", "publicoObjetivoId") DO NOTHING;

-- Keep legacy activity columns synchronized as derived compatibility data.
WITH rangos AS (
  SELECT
    relacion."actividadId",
    BOOL_OR(
      publico."edadMinimaSugerida" IS NULL
      AND publico."edadMaximaSugerida" IS NULL
    ) AS sin_restriccion,
    BOOL_OR(publico."edadMaximaSugerida" IS NULL) AS sin_maximo,
    MIN(publico."edadMinimaSugerida") AS edad_minima,
    MAX(publico."edadMaximaSugerida") AS edad_maxima
  FROM "ActividadPublicoObjetivo" AS relacion
  INNER JOIN "PublicoObjetivo" AS publico
    ON publico."id" = relacion."publicoObjetivoId"
  GROUP BY relacion."actividadId"
)
UPDATE "Actividad" AS actividad
SET
  "edadMinima" = CASE
    WHEN rangos.sin_restriccion THEN NULL
    ELSE rangos.edad_minima
  END,
  "edadMaxima" = CASE
    WHEN rangos.sin_restriccion OR rangos.sin_maximo THEN NULL
    ELSE rangos.edad_maxima
  END
FROM rangos
WHERE actividad."id" = rangos."actividadId";
