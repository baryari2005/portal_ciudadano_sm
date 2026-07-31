import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogConflictError, CatalogNotFoundError } from "@/lib/errors/catalog-errors";
import type { ResourceInput, UpdateResourceInput } from "../schemas/resource.schema";

const include = { establecimiento: { select: { id: true, nombre: true } } } as const;
export async function listResources(filters: { search?: string; establishmentId?: string; status?: "ACTIVO" | "MANTENIMIENTO" | "INACTIVO" } = {}) {
  const search = filters.search?.trim();
  const where: Prisma.RecursoWhereInput = { establecimientoId: filters.establishmentId, estado: filters.status, ...(search ? { OR: [{ nombre: { contains: search, mode: "insensitive" } }, { codigo: { contains: search, mode: "insensitive" } }, { descripcion: { contains: search, mode: "insensitive" } }] } : {}) };
  return prisma.recurso.findMany({ where, include, orderBy: [{ establecimiento: { nombre: "asc" } }, { nombre: "asc" }] });
}
export const getResource = (id: string) => prisma.recurso.findUnique({ where: { id }, include });
async function assertCode(establecimientoId: string, codigo: string, id?: string) { const found = await prisma.recurso.findFirst({ where: { establecimientoId, codigo, ...(id ? { id: { not: id } } : {}) } }); if (found) throw new CatalogConflictError("Ya existe un recurso con ese código en el establecimiento."); }
export async function createResource(input: ResourceInput) { await assertCode(input.establecimientoId, input.codigo); return prisma.recurso.create({ data: input, include }); }
export async function updateResource(id: string, input: UpdateResourceInput) { const current = await prisma.recurso.findUnique({ where: { id } }); if (!current) throw new CatalogNotFoundError("Recurso no encontrado."); const establecimientoId = input.establecimientoId ?? current.establecimientoId; const codigo = input.codigo ?? current.codigo; await assertCode(establecimientoId, codigo, id); return prisma.recurso.update({ where: { id }, data: input, include }); }
export async function deleteResource(id: string) { const current = await prisma.recurso.findUnique({ where: { id }, select: { id: true, _count: { select: { actividades: true, horarios: true, reservas: true, bloqueos: true } } } }); if (!current) throw new CatalogNotFoundError("Recurso no encontrado."); const used = Object.values(current._count).some((count) => count > 0); if (used) return prisma.recurso.update({ where: { id }, data: { estado: "INACTIVO" }, include }); await prisma.recurso.delete({ where: { id } }); return { id, deleted: true } as const; }
