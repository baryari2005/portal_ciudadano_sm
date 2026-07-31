import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  CatalogConflictError,
  CatalogNotFoundError,
} from "@/lib/errors/catalog-errors";
import { toSlug } from "@/lib/slug";

import type {
  CategoriaActividadInput,
  UpdateCategoriaActividadInput,
} from "../schemas/categoria-actividad.schema";

const allowedOrderBy = ["orden", "nombre", "createdAt"] as const;

export type CategoriaActividadListParams = {
  activo?: boolean;
  nombre?: string;
  search?: string;
  orderBy?: (typeof allowedOrderBy)[number];
  orderDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function normalizeInput(input: CategoriaActividadInput) {
  return {
    ...input,
    nombre: input.nombre.trim(),
    slug: toSlug(input.slug || input.nombre),
    descripcion: input.descripcion || null,
    color: input.color || null,
    icono: input.icono || null,
  };
}

function buildWhere(params: CategoriaActividadListParams) {
  const filters: Prisma.CategoriaActividadWhereInput[] = [];

  if (typeof params.activo === "boolean") {
    filters.push({ activo: params.activo });
  }

  if (params.nombre) {
    filters.push({
      nombre: { contains: params.nombre.trim(), mode: "insensitive" },
    });
  }

  if (params.search) {
    const search = params.search.trim();
    filters.push({
      OR: [
        { nombre: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  return filters.length ? { AND: filters } : {};
}

async function assertUniqueCategoria(
  nombre: string,
  slug: string,
  currentId?: string,
) {
  const duplicate = await prisma.categoriaActividad.findFirst({
    where: {
      ...(currentId ? { id: { not: currentId } } : {}),
      OR: [{ nombre: { equals: nombre, mode: "insensitive" } }, { slug }],
    },
    select: { nombre: true, slug: true },
  });

  if (!duplicate) {
    return;
  }

  if (duplicate.slug === slug) {
    throw new CatalogConflictError("Ya existe una categoria con ese slug.");
  }

  throw new CatalogConflictError("Ya existe una categoria con ese nombre.");
}

export async function listCategoriasActividades(
  params: CategoriaActividadListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 50), 100);
  const orderBy = allowedOrderBy.includes(params.orderBy ?? "orden")
    ? (params.orderBy ?? "orden")
    : "orden";
  const orderDir = params.orderDir === "desc" ? "desc" : "asc";
  const where = buildWhere(params);

  const [total, items] = await prisma.$transaction([
    prisma.categoriaActividad.count({ where }),
    prisma.categoriaActividad.findMany({
      where,
      orderBy: [{ [orderBy]: orderDir }, { nombre: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function getCategoriaActividad(id: string) {
  return prisma.categoriaActividad.findUnique({ where: { id } });
}

export async function createCategoriaActividad(input: CategoriaActividadInput) {
  const data = normalizeInput(input);
  await assertUniqueCategoria(data.nombre, data.slug);

  return prisma.categoriaActividad.create({ data });
}

export async function updateCategoriaActividad(
  id: string,
  input: UpdateCategoriaActividadInput,
) {
  const current = await prisma.categoriaActividad.findUnique({ where: { id } });

  if (!current) {
    throw new CatalogNotFoundError("Categoria no encontrada.");
  }

  const nombre = input.nombre?.trim() ?? current.nombre;
  const slug = toSlug(input.slug || nombre);

  await assertUniqueCategoria(nombre, slug, id);

  return prisma.categoriaActividad.update({
    where: { id },
    data: {
      nombre,
      slug,
      descripcion:
        input.descripcion === undefined
          ? current.descripcion
          : input.descripcion || null,
      color: input.color === undefined ? current.color : input.color || null,
      icono: input.icono === undefined ? current.icono : input.icono || null,
      orden: input.orden ?? current.orden,
      activo: input.activo ?? current.activo,
    },
  });
}

export async function deactivateCategoriaActividad(id: string) {
  return updateCategoriaActividad(id, { activo: false });
}

export async function reactivateCategoriaActividad(id: string) {
  return updateCategoriaActividad(id, { activo: true });
}
