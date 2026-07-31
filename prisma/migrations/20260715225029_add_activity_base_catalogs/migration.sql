-- CreateTable
CREATE TABLE "CategoriaActividad" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT,
    "icono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaActividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicoObjetivo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "edadMinimaSugerida" INTEGER,
    "edadMaximaSugerida" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicoObjetivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaActividad_slug_key" ON "CategoriaActividad"("slug");

-- CreateIndex
CREATE INDEX "CategoriaActividad_nombre_idx" ON "CategoriaActividad"("nombre");

-- CreateIndex
CREATE INDEX "CategoriaActividad_activo_idx" ON "CategoriaActividad"("activo");

-- CreateIndex
CREATE INDEX "CategoriaActividad_orden_idx" ON "CategoriaActividad"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "PublicoObjetivo_slug_key" ON "PublicoObjetivo"("slug");

-- CreateIndex
CREATE INDEX "PublicoObjetivo_nombre_idx" ON "PublicoObjetivo"("nombre");

-- CreateIndex
CREATE INDEX "PublicoObjetivo_activo_idx" ON "PublicoObjetivo"("activo");

-- CreateIndex
CREATE INDEX "PublicoObjetivo_orden_idx" ON "PublicoObjetivo"("orden");
