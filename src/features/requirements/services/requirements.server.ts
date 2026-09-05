import { Prisma, RequisitoTipo } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogConflictError, CatalogNotFoundError } from "@/lib/errors/catalog-errors";
import { toSlug } from "@/lib/slug";
import { requirementSchema, type RequirementInput, type UpdateRequirementInput } from "../schemas/requirement.schema";

export type RequirementListParams = { search?: string; type?: RequisitoTipo; active?: boolean; requiresDocument?: boolean; orderBy?: "orden" | "nombre" | "createdAt" | "updatedAt"; orderDir?: "asc" | "desc" };
const normalize = (input: RequirementInput) => ({ ...input, requiereDocumento: input.tipo === "DOCUMENTO", documentoPersonal: input.tipo === "DOCUMENTO", tieneVencimiento: input.tipo === "DOCUMENTO" && input.tieneVencimiento, vigenciaDias: input.tipo === "DOCUMENTO" && input.tieneVencimiento ? input.vigenciaDias : null, nombre: input.nombre.trim(), slug: toSlug(input.slug || input.nombre), descripcion: input.descripcion || null, imagenUrl: input.imagenUrl || null, instrucciones: input.instrucciones || null });
async function assertUnique(slug: string, id?: string) { const found = await prisma.requisito.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } }); if (found) throw new CatalogConflictError("Ya existe un requisito con ese slug."); }

export async function listRequirements(params: RequirementListParams = {}) {
  const where: Prisma.RequisitoWhereInput = {};
  if (params.search?.trim()) where.OR = ["nombre", "slug", "descripcion"].map((field) => ({ [field]: { contains: params.search!.trim(), mode: "insensitive" } })) as Prisma.RequisitoWhereInput[];
  if (params.type) where.tipo = params.type;
  if (params.active !== undefined) where.activo = params.active;
  if (params.requiresDocument !== undefined) where.requiereDocumento = params.requiresDocument;
  const orderBy = params.orderBy ?? "orden";
  return prisma.requisito.findMany({ where, orderBy: [{ [orderBy]: params.orderDir === "desc" ? "desc" : "asc" }, { nombre: "asc" }] });
}
export const getRequirement = (id: string) => prisma.requisito.findUnique({ where: { id } });
export async function createRequirement(input: RequirementInput) { const data = normalize(input); await assertUnique(data.slug); return prisma.requisito.create({ data }); }
export async function updateRequirement(id: string, input: UpdateRequirementInput) { const current = await prisma.requisito.findUnique({ where: { id } }); if (!current) throw new CatalogNotFoundError("Requisito no encontrado."); const merged = requirementSchema.parse({ ...current, ...input }); const data = normalize(merged); await assertUnique(data.slug, id); return prisma.requisito.update({ where: { id }, data }); }
export const deactivateRequirement = (id: string) => updateRequirement(id, { activo: false });
export const reactivateRequirement = (id: string) => updateRequirement(id, { activo: true });
