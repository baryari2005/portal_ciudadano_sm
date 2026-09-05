import { AuditoriaAccion, AuditoriaEntidad, AuditoriaOrigen, Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError } from "@/lib/errors/catalog-errors";
import { hashAuditIp, sanitizeAuditData } from "../helpers/audit-log.helpers";
import type { AuditLogFilters } from "../types/audit-log.types";

type Db = Prisma.TransactionClient | PrismaClient;
type AuditLogRow = Prisma.RegistroAuditoriaGetPayload<Record<string, never>>;

export type CreateAuditLogInput = { actorId?: string | null; action: AuditoriaAccion; entityType: AuditoriaEntidad; entityId?: string | null; entityName?: string | null; changes?: Record<string, unknown> | null; metadata?: Record<string, unknown> | null; origin: AuditoriaOrigen; requestContext?: { ip?: string | null; userAgent?: string | null } };

const map = (row: AuditLogRow) => ({ id: row.id, actorId: row.actorId, actorName: row.actorNombre, actorEmail: row.actorEmail, action: row.accion, entityType: row.entidadTipo, entityId: row.entidadId, entityName: row.entidadNombre, changes: row.cambios, metadata: row.metadata, origin: row.origen, ipHash: row.ipHash, userAgent: row.userAgent, createdAt: row.createdAt });

export async function createAuditLog(input: CreateAuditLogInput, db: Db = prisma) {
  const actor = input.actorId ? await db.usuario.findUnique({ where: { id: input.actorId }, select: { id: true, nombre: true, apellido: true, email: true } }) : null;
  return map(await db.registroAuditoria.create({ data: { actorId: actor?.id ?? null, actorNombre: actor ? [actor.nombre, actor.apellido].filter(Boolean).join(" ") || null : null, actorEmail: actor?.email ?? null, accion: input.action, entidadTipo: input.entityType, entidadId: input.entityId ?? null, entidadNombre: input.entityName?.slice(0, 300) ?? null, cambios: sanitizeAuditData(input.changes) as Prisma.InputJsonValue | undefined, metadata: sanitizeAuditData(input.metadata) as Prisma.InputJsonValue | undefined, origen: input.origin, ipHash: hashAuditIp(input.requestContext?.ip), userAgent: input.requestContext?.userAgent?.slice(0, 300) ?? null } }));
}

export const createAuditLogTx = (tx: Prisma.TransactionClient, input: CreateAuditLogInput) => createAuditLog(input, tx);

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const page = Number(filters.page) || 1;
  const pageSize = Math.min(Number(filters.pageSize) || 20, 100);
  const search = filters.search?.trim();
  const where: Prisma.RegistroAuditoriaWhereInput = { actorId: filters.actorId || undefined, accion: filters.action || undefined, entidadTipo: filters.entityType || undefined, entidadId: filters.entityId || undefined, origen: filters.origin || undefined, createdAt: filters.dateFrom || filters.dateTo ? { gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined, lte: filters.dateTo ? new Date(filters.dateTo) : undefined } : undefined, ...(search ? { OR: [{ actorNombre: { contains: search, mode: "insensitive" } }, { actorEmail: { contains: search, mode: "insensitive" } }, { entidadNombre: { contains: search, mode: "insensitive" } }] } : {}) };
  const [total, rows] = await prisma.$transaction([prisma.registroAuditoria.count({ where }), prisma.registroAuditoria.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize })]);
  return { items: rows.map(map), meta: { total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) } };
}

export async function getAuditLogById(id: string) {
  const row = await prisma.registroAuditoria.findUnique({ where: { id } });
  if (!row) throw new CatalogNotFoundError("Registro de auditoría no encontrado.");
  return map(row);
}
