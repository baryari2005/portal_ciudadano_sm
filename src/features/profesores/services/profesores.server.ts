import { Prisma, ProfesorEstado } from "@prisma/client";

import { prisma } from "@/lib/db";
import type {
  CreateProfesorInput,
  ProfesorFilters,
  UpdateProfesorInput,
} from "../schemas/profesor.schema";

export class ProfesorError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const usuarioSelect = {
  id: true,
  nombre: true,
  apellido: true,
  documento: true,
  email: true,
  celular: true,
  avatarUrl: true,
  rol: { select: { codigo: true, nombre: true } },
} satisfies Prisma.UsuarioSelect;

const profesorInclude = {
  usuario: { select: usuarioSelect },
} satisfies Prisma.ProfesorInclude;

function mapProfesor<
  T extends { usuario: { documento: string | null; celular: string | null } },
>(item: T) {
  const { documento, celular, ...usuario } = item.usuario;
  return {
    ...item,
    usuario: { ...usuario, dni: documento, telefono: celular },
  };
}

function clean(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

export async function listarProfesores(filters: ProfesorFilters) {
  const search = filters.search?.trim();
  const where: Prisma.ProfesorWhereInput = {
    ...(filters.estado ? { estado: filters.estado as ProfesorEstado } : {}),
    ...(filters.especialidad
      ? {
          especialidad: { contains: filters.especialidad, mode: "insensitive" },
        }
      : {}),
    ...(filters.usuarioId ? { usuarioId: filters.usuarioId } : {}),
    ...(search
      ? {
          OR: [
            { especialidad: { contains: search, mode: "insensitive" } },
            { matricula: { contains: search, mode: "insensitive" } },
            {
              usuario: {
                is: {
                  OR: [
                    { nombre: { contains: search, mode: "insensitive" } },
                    { apellido: { contains: search, mode: "insensitive" } },
                    { documento: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.ProfesorOrderByWithRelationInput =
    filters.orderBy === "nombre" || filters.orderBy === "apellido"
      ? { usuario: { [filters.orderBy]: filters.orderDir } }
      : { [filters.orderBy]: filters.orderDir };
  const [total, rows] = await prisma.$transaction([
    prisma.profesor.count({ where }),
    prisma.profesor.findMany({
      where,
      include: profesorInclude,
      orderBy: [orderBy, { createdAt: "desc" }],
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);
  return {
    items: rows.map(mapProfesor),
    meta: {
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
  };
}

export async function obtenerProfesorPorId(id: string) {
  const item = await prisma.profesor.findUnique({
    where: { id },
    include: profesorInclude,
  });
  return item ? mapProfesor(item) : null;
}

export async function crearProfesor(input: CreateProfesorInput) {
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findFirst({
      where: {
        id: input.usuarioId,
        deletedAt: null,
        rol: { codigo: { in: ["teacher", "admin"] } },
      },
      select: { id: true },
    });
    if (!usuario)
      throw new ProfesorError(
        "El usuario seleccionado no existe o no está disponible.",
        422,
      );
    const existing = await tx.profesor.findUnique({
      where: { usuarioId: input.usuarioId },
      select: { id: true },
    });
    if (existing)
      throw new ProfesorError(
        "El usuario ya posee un perfil de profesor.",
        409,
      );
    const item = await tx.profesor.create({
      data: {
        usuarioId: input.usuarioId,
        especialidad: clean(input.especialidad),
        descripcion: clean(input.descripcion),
        matricula: clean(input.matricula),
        fotoUrl: clean(input.fotoUrl),
        estado: input.estado,
      },
      include: profesorInclude,
    });
    return mapProfesor(item);
  });
}

export async function editarProfesor(id: string, input: UpdateProfesorInput) {
  const exists = await prisma.profesor.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new ProfesorError("Profesor no encontrado.", 404);
  const item = await prisma.profesor.update({
    where: { id },
    data: {
      especialidad: clean(input.especialidad),
      descripcion: clean(input.descripcion),
      matricula: clean(input.matricula),
      fotoUrl: clean(input.fotoUrl),
    },
    include: profesorInclude,
  });
  return mapProfesor(item);
}

export async function cambiarEstadoProfesor(
  id: string,
  estado: ProfesorEstado,
) {
  const exists = await prisma.profesor.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) throw new ProfesorError("Profesor no encontrado.", 404);
  return mapProfesor(
    await prisma.profesor.update({
      where: { id },
      data: { estado },
      include: profesorInclude,
    }),
  );
}

export const desactivarProfesor = (id: string) =>
  cambiarEstadoProfesor(id, "INACTIVO");
export const reactivarProfesor = (id: string) =>
  cambiarEstadoProfesor(id, "ACTIVO");
export const suspenderProfesor = (id: string) =>
  cambiarEstadoProfesor(id, "SUSPENDIDO");

export async function listarUsuariosDisponibles(
  search = "",
  page = 1,
  pageSize = 20,
  roleCode?: "teacher" | "admin",
) {
  const query = search.trim();
  const where: Prisma.UsuarioWhereInput = {
    deletedAt: null,
    profesor: null,
    rol: { codigo: roleCode ?? { in: ["teacher", "admin"] } },
    ...(query
      ? {
          OR: [
            { nombre: { contains: query, mode: "insensitive" } },
            { apellido: { contains: query, mode: "insensitive" } },
            { documento: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, users] = await prisma.$transaction([
    prisma.usuario.count({ where }),
    prisma.usuario.findMany({
      where,
      select: usuarioSelect,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    items: users.map(({ documento, celular, ...user }) => ({
      ...user,
      dni: documento,
      telefono: celular,
    })),
    meta: {
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
