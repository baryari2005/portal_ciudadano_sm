-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'NO_BINARIO', 'PREFIERE_NO_DECIR', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO', 'UNION_CONVIVENCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "Nacionalidad" AS ENUM ('Argentina', 'Brasil', 'Uruguay', 'Paraguay', 'Chile', 'Bolivia', 'Perú', 'Ecuador', 'Colombia', 'Venezuela', 'México', 'Guatemala', 'El Salvador', 'Honduras', 'Nicaragua', 'Costa Rica', 'Panamá', 'Cuba', 'República Dominicana', 'España', 'Italia', 'Francia', 'Alemania', 'Reino Unido', 'Portugal', 'Estados Unidos', 'Canadá', 'China', 'Japón', 'Corea del Sur', 'India', 'Rusia', 'Ucrania', 'Marruecos', 'Nigeria', 'Sudáfrica', 'Argelia', 'Senegal', 'Turquía', 'Israel', 'Australia', 'Nueva Zelanda');

-- CreateEnum
CREATE TYPE "TipoTelefono" AS ENUM ('MOVIL', 'FIJO', 'LABORAL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('INDETERMINADO', 'PLAZO_FIJO', 'TEMPORAL', 'PASANTIA', 'MONOTRIBUTO');

-- CreateEnum
CREATE TYPE "EstadoLaboral" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'LICENCIA', 'BAJA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DNI', 'PAS', 'LE', 'LC', 'CI');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tipoDocumento" "TipoDocumento" DEFAULT 'DNI',
    "documento" TEXT,
    "cuil" TEXT,
    "email" TEXT NOT NULL,
    "celular" TEXT,
    "domicilio" TEXT,
    "codigoPostal" TEXT,
    "nombre" TEXT,
    "apellido" TEXT,
    "avatarUrl" TEXT,
    "fechaNacimiento" DATE,
    "genero" "Genero",
    "estadoCivil" "EstadoCivil",
    "nacionalidad" "Nacionalidad",
    "password" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "rolId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Legajo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuarioId" UUID NOT NULL,
    "numeroLegajo" INTEGER,
    "fechaIngreso" TIMESTAMPTZ(6),
    "fechaEgreso" TIMESTAMPTZ(6),
    "estadoLaboral" "EstadoLaboral" NOT NULL DEFAULT 'ACTIVO',
    "tipoContrato" "TipoContrato",
    "puesto" TEXT,
    "area" TEXT,
    "departamento" TEXT,
    "categoria" TEXT,
    "matriculaProvincial" TEXT,
    "matriculaNacional" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Legajo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" SERIAL NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "nombre" TEXT,
    "descripcion" TEXT,
    "icono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" INTEGER NOT NULL,
    "permisoId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_userId_key" ON "Usuario"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_documento_key" ON "Usuario"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cuil_key" ON "Usuario"("cuil");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rolId_idx" ON "Usuario"("rolId");

-- CreateIndex
CREATE INDEX "Usuario_apellido_nombre_idx" ON "Usuario"("apellido", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_usuarioId_key" ON "Legajo"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Legajo_numeroLegajo_key" ON "Legajo"("numeroLegajo");

-- CreateIndex
CREATE INDEX "Legajo_estadoLaboral_idx" ON "Legajo"("estadoLaboral");

-- CreateIndex
CREATE INDEX "Legajo_area_departamento_idx" ON "Legajo"("area", "departamento");

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Permiso_modulo_idx" ON "Permiso"("modulo");

-- CreateIndex
CREATE INDEX "Permiso_activo_idx" ON "Permiso"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_modulo_accion_key" ON "Permiso"("modulo", "accion");

-- CreateIndex
CREATE INDEX "RolPermiso_permisoId_idx" ON "RolPermiso"("permisoId");
