CREATE TABLE "UsuarioBorrador" (
    "id" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "subjectUserId" UUID,
    "scope" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "stepStatuses" JSONB NOT NULL,
    "viewMode" TEXT NOT NULL DEFAULT 'workflow',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsuarioBorrador_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsuarioBorrador_ownerId_scope_mode_updatedAt_idx" ON "UsuarioBorrador"("ownerId", "scope", "mode", "updatedAt");
CREATE INDEX "UsuarioBorrador_subjectUserId_idx" ON "UsuarioBorrador"("subjectUserId");
