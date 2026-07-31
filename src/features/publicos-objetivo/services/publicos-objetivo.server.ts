import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import {
  CatalogConflictError,
  CatalogNotFoundError,
} from "@/lib/errors/catalog-errors";
import { toSlug } from "@/lib/slug";

import type {
  PublicoObjetivoInput,
  UpdatePublicoObjetivoInput,
} from "../schemas/publico-objetivo.schema";

const allowedOrderBy = ["orden", "nombre", "createdAt"] as const;

export type PublicoObjetivoListParams = {
  activo?: boolean;
  nombre?: string;
  search?: string;
  orderBy?: (typeof allowedOrderBy)[number];
  orderDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function normalizeInput(input: PublicoObjetivoInput) {
  return {
    ...input,
    nombre: input.nombre.trim(),
    slug: toSlug(input.slug || input.nombre),
    descripcion: input.descripcion || null,
    edadMinimaSugerida: input.edadMinimaSugerida ?? null,
    edadMaximaSugerida: input.edadMaximaSugerida ?? null,
    generosAdmitidos: input.generosAdmitidos ?? [],
  };
}

function buildWhere(params: PublicoObjetivoListParams) {
  const filters: Prisma.PublicoObjetivoWhereInput[] = [];

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

async function assertUniquePublico(
  nombre: string,
  slug: string,
  currentId?: string,
) {
  const duplicate = await prisma.publicoObjetivo.findFirst({
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
    throw new CatalogConflictError(
      "Ya existe un publico objetivo con ese slug.",
    );
  }

  throw new CatalogConflictError(
    "Ya existe un publico objetivo con ese nombre.",
  );
}

export async function listPublicosObjetivo(
  params: PublicoObjetivoListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(Math.max(1, params.pageSize ?? 50), 100);
  const orderBy = allowedOrderBy.includes(params.orderBy ?? "orden")
    ? (params.orderBy ?? "orden")
    : "orden";
  const orderDir = params.orderDir === "desc" ? "desc" : "asc";
  const where = buildWhere(params);

  const [total, items] = await prisma.$transaction([
    prisma.publicoObjetivo.count({ where }),
    prisma.publicoObjetivo.findMany({
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

export async function getPublicoObjetivo(id: string) {
  return prisma.publicoObjetivo.findUnique({ where: { id } });
}

export async function createPublicoObjetivo(input: PublicoObjetivoInput) {
  const data = normalizeInput(input);
  await assertUniquePublico(data.nombre, data.slug);

  return prisma.publicoObjetivo.create({ data });
}

export async function updatePublicoObjetivo(
  id: string,
  input: UpdatePublicoObjetivoInput,
) {
  const current = await prisma.publicoObjetivo.findUnique({ where: { id } });

  if (!current) {
    throw new CatalogNotFoundError("Publico objetivo no encontrado.");
  }

  const nombre = input.nombre?.trim() ?? current.nombre;
  const slug = toSlug(input.slug || nombre);
  await assertUniquePublico(nombre, slug, id);

  return prisma.publicoObjetivo.update({
    where: { id },
    data: {
      nombre,
      slug,
      descripcion:
        input.descripcion === undefined
          ? current.descripcion
          : input.descripcion || null,
      orden: input.orden ?? current.orden,
      edadMinimaSugerida: input.edadMinimaSugerida === undefined ? current.edadMinimaSugerida : input.edadMinimaSugerida,
      edadMaximaSugerida: input.edadMaximaSugerida === undefined ? current.edadMaximaSugerida : input.edadMaximaSugerida,
      generosAdmitidos: input.generosAdmitidos ?? current.generosAdmitidos,
      activo: input.activo ?? current.activo,
    },
  });
}

export async function deactivatePublicoObjetivo(id: string) {
  return updatePublicoObjetivo(id, { activo: false });
}

export async function reactivatePublicoObjetivo(id: string) {
  return updatePublicoObjetivo(id, { activo: true });
}
