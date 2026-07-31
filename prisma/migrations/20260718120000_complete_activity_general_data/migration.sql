-- Amplía el estado autoritativo de Actividad sin eliminar valores heredados.
ALTER TYPE "ActividadEstado" ADD VALUE IF NOT EXISTS 'SIN_CUPO';
ALTER TYPE "ActividadEstado" ADD VALUE IF NOT EXISTS 'SUSPENDIDA';
ALTER TYPE "ActividadEstado" ADD VALUE IF NOT EXISTS 'FINALIZADA';
ALTER TYPE "ActividadEstado" ADD VALUE IF NOT EXISTS 'CANCELADA';

-- La columna heredada continúa disponible, pero su default acompaña al estado autoritativo.
ALTER TABLE "Actividad" ALTER COLUMN "estadoTexto" SET DEFAULT 'borrador';
