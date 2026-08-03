import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Prisma } from "@prisma/client";
import { createAuditLogTx } from "@/features/audit-log/services/audit-log.server";
import { ALLOWED_ENROLLMENT_DOCUMENT_TYPES, MAX_ENROLLMENT_DOCUMENT_BYTES, sanitizeOriginalName } from "@/features/enrollment-documents/constants/file-rules";
import { createEnrollmentDocumentSignedUrl, removeEnrollmentDocument, uploadEnrollmentDocument } from "@/features/enrollment-documents/services/document-storage.server";
import { promoteDocumentReadyEnrollments } from "@/features/enrollments/services/enrollments.server";
import { createNotification, createNotifications, markEntityNotificationsAsRead } from "@/features/notifications/services/notifications.server";
import { prisma } from "@/lib/db";
import { CatalogConflictError, CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { getDocumentValidity } from "./document-expiration.server";

const include = { requisito: true, usuario: { select: { id: true, nombre: true, apellido: true, documento: true } }, revisadoPor: { select: { nombre: true, apellido: true } } } satisfies Prisma.DocumentoUsuarioInclude;
type DocumentWithRelations = Prisma.DocumentoUsuarioGetPayload<{ include: typeof include }>;
const map = (row: DocumentWithRelations) => ({ id: row.id, userId: row.usuarioId, requirementId: row.requisitoId, requirementName: row.requisitoNombreSnapshot, status: row.estado, validity: getDocumentValidity(row.fechaVencimiento, row.requisito?.diasAvisoVencimiento ?? 30), originalName: row.nombreOriginal, mimeType: row.mimeType, size: row.tamanioBytes, version: row.version, uploadedAt: row.subidoAt, reviewedAt: row.revisadoAt, expiresAt: row.fechaVencimiento, rejectionReason: row.motivoRechazo, reviewObservations: row.observacionesRevision, citizenObservations: row.observacionesCiudadano, user: row.usuario, reviewer: row.revisadoPor });

function validateDocumentFile(file: File) {
  if (!file.size || file.size > MAX_ENROLLMENT_DOCUMENT_BYTES) throw new CatalogValidationError("El archivo está vacío o supera los 10 MB.");
  const expected = ALLOWED_ENROLLMENT_DOCUMENT_TYPES[file.type as keyof typeof ALLOWED_ENROLLMENT_DOCUMENT_TYPES];
  const extension = extname(file.name).toLowerCase();
  if (!expected || (file.type === "image/jpeg" ? ![".jpg", ".jpeg"].includes(extension) : extension !== expected)) throw new CatalogValidationError("Solo se permiten PDF, JPG y PNG.");
  return { expected, extension };
}

export async function listCitizenUserDocuments(userId: string) {
  const requirements = await prisma.requisito.findMany({ where: { activo: true, requiereDocumento: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] });
  const documents = await prisma.documentoUsuario.findMany({ where: { usuarioId: userId }, include, orderBy: [{ requisitoId: "asc" }, { version: "desc" }] });
  return { requirements: requirements.map((requirement) => ({ id: requirement.id, name: requirement.nombre, instructions: requirement.instrucciones, current: documents.find((document) => document.requisitoId === requirement.id) ? map(documents.find((document) => document.requisitoId === requirement.id)!) : null, history: documents.filter((document) => document.requisitoId === requirement.id).map(map) })) };
}

async function uploadUserDocument(input: { userId: string; requirementId: string; file: File; uploaderId: string; observations?: string | null; expiresAt?: string | null; blockApproved: boolean; afterCreate?: (tx: Prisma.TransactionClient, row: DocumentWithRelations) => Promise<void> }) {
  const requirement = await prisma.requisito.findFirst({ where: { id: input.requirementId, activo: true, requiereDocumento: true, documentoPersonal: true } });
  if (!requirement) throw new CatalogValidationError("El tipo de documento no está disponible.");
  const userExists = await prisma.usuario.count({ where: { id: input.userId, deletedAt: null } });
  if (!userExists) throw new CatalogNotFoundError("La persona seleccionada no existe.");
  const { expected, extension } = validateDocumentFile(input.file);
  const content = Buffer.from(await input.file.arrayBuffer());
  const storagePath = `users/${input.userId}/${input.requirementId}/${randomUUID()}${expected}`;
  await uploadEnrollmentDocument(storagePath, content, input.file.type);
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Usuario" WHERE "id" = CAST(${input.userId} AS uuid) FOR UPDATE`;
      const previous = await tx.documentoUsuario.findMany({ where: { usuarioId: input.userId, requisitoId: input.requirementId }, orderBy: { version: "desc" } });
      if (previous.some((document) => document.estado === "PENDIENTE")) throw new CatalogConflictError("Ya existe un documento pendiente de revisión.");
      if (input.blockApproved && previous.some((document) => document.estado === "APROBADO")) throw new CatalogConflictError("La persona ya posee un documento aprobado de este tipo. Debe intervenir un administrador para reemplazarlo.");
      const row = await tx.documentoUsuario.create({ data: { usuarioId: input.userId, requisitoId: input.requirementId, version: (previous[0]?.version ?? 0) + 1, estado: "PENDIENTE", nombreOriginal: sanitizeOriginalName(input.file.name), storagePath, mimeType: input.file.type, extension, tamanioBytes: input.file.size, sha256: createHash("sha256").update(content).digest("hex"), requisitoNombreSnapshot: requirement.nombre, instruccionesSnapshot: requirement.instrucciones, observacionesCiudadano: input.observations?.trim() || null, fechaVencimiento: input.expiresAt ? new Date(`${input.expiresAt}T00:00:00.000Z`) : null, subidoPorId: input.uploaderId }, include });
      await input.afterCreate?.(tx, row);
      return map(row);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    await removeEnrollmentDocument(storagePath).catch(() => undefined);
    throw error;
  }
}

export const uploadCitizenUserDocument = (userId: string, requirementId: string, file: File, observations?: string | null, expiresAt?: string | null) => uploadUserDocument({ userId, requirementId, file, uploaderId: userId, observations, expiresAt, blockApproved: false });
export const uploadAdminUserDocument = (userId: string, requirementId: string, file: File, adminId: string, observations?: string | null) => uploadUserDocument({ userId, requirementId, file, uploaderId: adminId, observations, blockApproved: false });

export async function uploadReceptionUserDocument(input: { userId: string; requirementId: string; file: File; operator: { id: string; nombre: string | null; apellido: string | null }; observations?: string | null; requestContext?: { ip?: string | null; userAgent?: string | null } }) {
  const operatorName = [input.operator.nombre, input.operator.apellido].filter(Boolean).join(" ") || "Operador de recepción";
  return uploadUserDocument({ ...input, uploaderId: input.operator.id, blockApproved: true, afterCreate: async (tx, row) => {
    const reviewers = await tx.usuario.findMany({ where: { deletedAt: null, estado: "ACTIVO", rol: { codigo: { notIn: ["reception", "teacher", "citizen"] }, permisos: { some: { permiso: { modulo: "enrollment_documents", accion: "asignar", activo: true } } } } }, select: { id: true } });
    if (!reviewers.length) throw new CatalogValidationError("No hay revisores de documentos autorizados configurados.");
    const personName = [row.usuario.nombre, row.usuario.apellido].filter(Boolean).join(" ") || "Una persona";
    await createNotifications(reviewers.map((reviewer) => ({ userId: reviewer.id, senderId: input.operator.id, type: "GENERAL" as const, title: "Nuevo documento pendiente de revisión", message: `${personName} presentó ${row.requisitoNombreSnapshot}. La carga fue realizada por ${operatorName}.`, priority: "ALTA" as const, actionUrl: `/user-documents/${row.id}/review`, actionLabel: "Revisar documento", entityType: "user_document", entityId: row.id, metadata: { userId: row.usuarioId, requirementId: row.requisitoId, operatorId: input.operator.id, source: "RECEPTION" }, deduplicationKey: `reception-user-document-uploaded:${row.id}` })), tx);
    await createAuditLogTx(tx, { actorId: input.operator.id, action: "CREAR", entityType: "DOCUMENTO_INSCRIPCION", entityId: row.id, entityName: row.requisitoNombreSnapshot, origin: "ADMINISTRACION", metadata: { workspace: "reception", userId: row.usuarioId, requirementId: row.requisitoId, status: "PENDIENTE" }, requestContext: input.requestContext });
  } });
}

export async function listAdminUserDocuments() { return (await prisma.documentoUsuario.findMany({ include, orderBy: { subidoAt: "desc" } })).map(map); }
export async function reviewUserDocument(id: string, reviewerId: string, status: "APROBADO" | "RECHAZADO", reason?: string | null) { return prisma.$transaction(async (tx) => { const row = await tx.documentoUsuario.findUnique({ where: { id }, include: { requisito: true } }); if (!row) throw new CatalogNotFoundError("Documento no encontrado."); const disapproving = row.estado === "APROBADO" && status === "RECHAZADO"; if (row.estado !== "PENDIENTE" && !disapproving) throw new CatalogConflictError("El documento ya fue revisado."); const reviewedAt = new Date(), rejectionReason = status === "RECHAZADO" ? reason?.trim() || "Documento observado." : null, expiresAt = status === "APROBADO" && row.requisito.tieneVencimiento && row.requisito.vigenciaDias ? new Date(reviewedAt.getTime() + row.requisito.vigenciaDias * 86_400_000) : null; const saved = await tx.documentoUsuario.update({ where: { id }, data: { estado: status, motivoRechazo: rejectionReason, revisadoPorId: reviewerId, revisadoAt: reviewedAt, fechaVencimiento: expiresAt }, include }); await markEntityNotificationsAsRead("user_document", id, reviewerId, tx); if (status === "APROBADO") await promoteDocumentReadyEnrollments(tx, row.usuarioId); await createNotification({ userId: row.usuarioId, type: status === "APROBADO" ? "DOCUMENTO_APROBADO" : "DOCUMENTO_RECHAZADO", title: status === "APROBADO" ? "Documento aprobado" : disapproving ? "Documento desaprobado" : "Documento rechazado", message: status === "APROBADO" ? `Tu documento ${row.requisitoNombreSnapshot} fue aprobado${expiresAt ? ` y vence el ${expiresAt.toLocaleDateString("es-AR")}` : ""}.` : `Tu documento ${row.requisitoNombreSnapshot} fue ${disapproving ? "desaprobado" : "rechazado"}. Motivo: ${rejectionReason}`, priority: status === "APROBADO" ? "NORMAL" : "ALTA", actionUrl: "/citizen/documents", actionLabel: "Ver mis documentos", entityType: "user_document", entityId: row.id, deduplicationKey: `user-document-${disapproving ? "disapproved" : `reviewed:${status}`}:${row.id}` }, tx); return map(saved); }); }
export async function getUserDocumentUrl(id: string, userId?: string) { const row = await prisma.documentoUsuario.findFirst({ where: { id, ...(userId ? { usuarioId: userId } : {}) } }); if (!row) throw new CatalogNotFoundError("Documento no encontrado."); return createEnrollmentDocumentSignedUrl(row.storagePath); }
