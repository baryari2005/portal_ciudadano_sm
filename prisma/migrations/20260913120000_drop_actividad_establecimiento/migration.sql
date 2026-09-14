-- DropIndex
DROP INDEX IF EXISTS "Actividad_establecimientoId_idx";

-- AlterTable
-- Dropping the column also drops any constraint (e.g. a legacy foreign key)
-- that depends solely on it; Postgres cascades that automatically.
ALTER TABLE "Actividad" DROP COLUMN IF EXISTS "establecimientoId";
