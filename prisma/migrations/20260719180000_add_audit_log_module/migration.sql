CREATE TYPE "AuditoriaAccion" AS ENUM ('CREAR', 'EDITAR', 'DESACTIVAR', 'REACTIVAR', 'ELIMINAR', 'CANCELAR', 'SUSPENDER', 'FINALIZAR', 'APROBAR', 'RECHAZAR', 'ASIGNAR', 'DESASIGNAR', 'CERRAR', 'REABRIR', 'EMITIR', 'REVOCAR', 'INSCRIBIR', 'PROMOVER', 'MARCAR_PRESENTE', 'MARCAR_AUSENTE', 'JUSTIFICAR');
CREATE TYPE "AuditoriaEntidad" AS ENUM ('USUARIO', 'ROL', 'PERMISO', 'ACTIVIDAD', 'ESTABLECIMIENTO', 'PROFESOR', 'HORARIO_ACTIVIDAD', 'INSCRIPCION', 'CLASE_ACTIVIDAD', 'ASISTENCIA', 'REQUISITO', 'DOCUMENTO_INSCRIPCION', 'CREDENCIAL_QR', 'NOTIFICACION');
CREATE TYPE "AuditoriaOrigen" AS ENUM ('ADMINISTRACION', 'PORTAL_CIUDADANO', 'QR', 'SISTEMA');

CREATE TABLE "RegistroAuditoria" (
  "id" TEXT NOT NULL,
  "actorId" UUID,
  "actorNombre" TEXT,
  "actorEmail" TEXT,
  "accion" "AuditoriaAccion" NOT NULL,
  "entidadTipo" "AuditoriaEntidad" NOT NULL,
  "entidadId" TEXT,
  "entidadNombre" TEXT,
  "cambios" JSONB,
  "metadata" JSONB,
  "origen" "AuditoriaOrigen" NOT NULL,
  "ipHash" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RegistroAuditoria_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RegistroAuditoria_actorId_idx" ON "RegistroAuditoria"("actorId");
CREATE INDEX "RegistroAuditoria_accion_idx" ON "RegistroAuditoria"("accion");
CREATE INDEX "RegistroAuditoria_entidadTipo_idx" ON "RegistroAuditoria"("entidadTipo");
CREATE INDEX "RegistroAuditoria_entidadId_idx" ON "RegistroAuditoria"("entidadId");
CREATE INDEX "RegistroAuditoria_origen_idx" ON "RegistroAuditoria"("origen");
CREATE INDEX "RegistroAuditoria_createdAt_idx" ON "RegistroAuditoria"("createdAt");
CREATE INDEX "RegistroAuditoria_entidadTipo_entidadId_createdAt_idx" ON "RegistroAuditoria"("entidadTipo", "entidadId", "createdAt");
