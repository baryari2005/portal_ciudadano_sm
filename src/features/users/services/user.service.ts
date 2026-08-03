import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { prisma } from "@/lib/db";
import { CreateUserDto } from "../schemas/user.schema";
import { buildUserWhere } from "../lib/user.filters";
import { UserWithRole } from "../lib/user.mapper";
import { syncProfessorProfile } from "./professor-profile-sync.server";

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function listUsers(params: {
  q: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  estado?: string;
  rolId?: string;
  scope?: "all" | "citizen" | "personnel";
}) {
  const { q, page, pageSize, sortBy, sortDir, estado, rolId, scope } = params;

  const where = buildUserWhere(q, estado, rolId, scope);

  const total = await prisma.usuario.count({ where });

  const items: UserWithRole[] = await prisma.usuario.findMany({
    where,
    include: { rol: true },
    orderBy: { [sortBy]: sortDir },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items,
    meta: { total, page, pageSize, pageCount },
  };
}

export async function createOrReviveUser(dto: CreateUserDto) {
  const email = dto.email.trim().toLowerCase();
  const userId = dto.userId.trim();
  const passwordHash = await bcrypt.hash(dto.password, 12);

  return prisma.$transaction(async (tx) => {
  const activeDup = await tx.usuario.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email }, { userId }],
    },
    select: { id: true, email: true, userId: true },
  });

  if (activeDup) {
    const field =
      activeDup.email === email
        ? "email"
        : activeDup.userId === userId
          ? "userId"
          : "usuario";

    throw new HttpError(`Ya existe un ${field} activo con ese valor.`, 409);
  }

  const soft = await tx.usuario.findFirst({
    where: {
      deletedAt: { not: null },
      OR: [{ email }, { userId }],
    },
    select: { id: true },
  });

  const baseData = {
    userId,
    email,
    password: passwordHash,
    rolId: dto.rolId,
    estado: "ACTIVO" as const,
    perfilCompleto: true,

    nombre: dto.nombre ?? null,
    apellido: dto.apellido ?? null,
    avatarUrl: dto.avatarUrl ?? null,
    fotoPerfilUrl: dto.fotoPerfilUrl ?? null,

    tipoDocumento: dto.tipoDocumento ?? null,
    documento: dto.documento ?? null,
    cuil: dto.cuil ?? null,

    celular: dto.celular ?? null,
    domicilio: dto.domicilio ?? null,
    localidad: dto.localidad ?? null,
    provincia: dto.provincia ?? null,
    domicilioPlaceId: dto.domicilioPlaceId ?? null,
    domicilioLat: dto.domicilioLat ?? null,
    domicilioLng: dto.domicilioLng ?? null,
    codigoPostal: dto.codigoPostal ?? null,
    contactoEmergenciaNombre: dto.contactoEmergenciaNombre ?? null,
    contactoEmergenciaTelefono: dto.contactoEmergenciaTelefono ?? null,
    coberturaMedicaId: dto.coberturaMedicaId ?? null,
    numeroAfiliado: dto.numeroAfiliado ?? null,

    fechaNacimiento: dto.fechaNacimiento ?? null,
    genero: dto.genero ?? null,
    estadoCivil: dto.estadoCivil ?? null,
    nacionalidad: dto.nacionalidad ?? null,
  };

  if (soft) {
    const revived = await tx.usuario.update({
      where: { id: soft.id },
      data: { ...baseData, deletedAt: null },
      select: { id: true },
    });

    await syncProfessorProfile(tx, revived.id, dto.rolId, dto.professorProfile);
    return { id: revived.id, revived: true };
  }

  const created = await tx.usuario.create({
    data: baseData,
    select: { id: true },
  });

  await syncProfessorProfile(tx, created.id, dto.rolId, dto.professorProfile);
  return { id: created.id, revived: false };
  });
}

export function handleUserError(err: unknown) {
  if (err instanceof ZodError) {
    return {
      message: err.issues.map((issue) => issue.message).join(", "),
      status: 400,
    };
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    return {
      message: "Ya existe un usuario con ese email/documento/cuil/userId.",
      status: 409,
    };
  }

  if (err instanceof HttpError) {
    return {
      message: err.message || "Error de validación",
      status: err.status,
    };
  }

  if (err instanceof Error && "status" in err && typeof err.status === "number") {
    return {
      message: err.message || "Error de validación",
      status: err.status,
    };
  }

  return {
    message: "Error creando usuario",
    status: 500,
  };
}
