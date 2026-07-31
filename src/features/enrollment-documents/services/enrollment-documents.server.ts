import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { DocumentoInscripcionEstado, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CatalogConflictError, CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { ALLOWED_ENROLLMENT_DOCUMENT_TYPES, MAX_ENROLLMENT_DOCUMENT_BYTES, sanitizeOriginalName } from "../constants/file-rules";
import type { EnrollmentDocumentFilters, ReviewEnrollmentDocumentInput } from "../schemas/enrollment-document.schema";
import type { EnrollmentDocumentationStatus } from "../types/enrollment-document.types";
import { createEnrollmentDocumentSignedUrl, removeEnrollmentDocument, uploadEnrollmentDocument } from "./document-storage.server";
import { createNotification } from "@/features/notifications/services/notifications.server";

const include = { requisito: true, inscripcion: { include: { usuario: { select: { id: true, nombre: true, apellido: true, documento: true } }, horarioActividad: { include: { actividad: { select: { id: true, nombre: true } } } } } } } satisfies Prisma.DocumentoInscripcionInclude;
type Row = Prisma.DocumentoInscripcionGetPayload<{ include: typeof include }>;
const map = (row: Row) => ({ id: row.id, enrollmentId: row.inscripcionId, requirementId: row.requisitoId, version: row.version, status: row.estado, originalName: row.nombreOriginal, mimeType: row.mimeType, sizeBytes: row.tamanioBytes, requirementName: row.requisitoNombreSnapshot, mandatory: row.obligatorioSnapshot, instructions: row.instruccionesSnapshot, citizenObservations: row.observacionesCiudadano, rejectionReason: row.motivoRechazo, reviewObservations: row.observacionesRevision, uploadedAt: row.subidoAt, reviewedAt: row.revisadoAt, citizen: { id: row.inscripcion.usuario.id, firstName: row.inscripcion.usuario.nombre, lastName: row.inscripcion.usuario.apellido, documentNumber: row.inscripcion.usuario.documento }, activity: { id: row.inscripcion.horarioActividad.actividad.id, name: row.inscripcion.horarioActividad.actividad.nombre }, schedule: { id: row.inscripcion.horarioActividad.id, day: row.inscripcion.horarioActividad.diaSemana, startTime: row.inscripcion.horarioActividad.horaInicio, endTime: row.inscripcion.horarioActividad.horaFin } });

export async function listEnrollmentDocuments(filters: EnrollmentDocumentFilters = {}) { const search = filters.search?.trim(); const where: Prisma.DocumentoInscripcionWhereInput = { estado: filters.status, inscripcionId: filters.enrollmentId, requisitoId: filters.requirementId, inscripcion: { usuarioId: filters.userId, horarioActividad: { id: filters.activityScheduleId, actividadId: filters.activityId } }, subidoAt: filters.dateFrom || filters.dateTo ? { gte: filters.dateFrom, lte: filters.dateTo } : undefined, ...(search ? { OR: [{ nombreOriginal: { contains: search, mode: "insensitive" } }, { requisitoNombreSnapshot: { contains: search, mode: "insensitive" } }, { inscripcion: { usuario: { nombre: { contains: search, mode: "insensitive" } } } }, { inscripcion: { usuario: { apellido: { contains: search, mode: "insensitive" } } } }, { inscripcion: { usuario: { documento: { contains: search, mode: "insensitive" } } } }, { inscripcion: { horarioActividad: { actividad: { nombre: { contains: search, mode: "insensitive" } } } } }] } : {}) }; return (await prisma.documentoInscripcion.findMany({ where, include, orderBy: { subidoAt: "desc" } })).map(map); }
export async function getEnrollmentDocument(id: string) { const row = await prisma.documentoInscripcion.findUnique({ where: { id }, include }); if (!row) throw new CatalogNotFoundError("Documento no encontrado."); const history = await prisma.documentoInscripcion.findMany({ where: { inscripcionId: row.inscripcionId, requisitoId: row.requisitoId }, include, orderBy: { version: "desc" } }); return { ...map(row), history: history.map(map) }; }

async function enrollmentContext(enrollmentId: string, userId?: string) { const enrollment = await prisma.inscripcion.findFirst({ where: { id: enrollmentId, ...(userId ? { usuarioId: userId } : {}) }, include: { horarioActividad: { include: { actividad: { include: { requisitos: { include: { requisito: true }, orderBy: { orden: "asc" } } } } } } } }); if (!enrollment) throw new CatalogNotFoundError("Inscripción no encontrada."); return enrollment; }
export async function listCitizenEnrollmentDocuments(enrollmentId: string, userId: string) { const enrollment = await enrollmentContext(enrollmentId, userId); const rows = await prisma.documentoInscripcion.findMany({ where: { inscripcionId: enrollmentId }, include, orderBy: [{ requisitoId: "asc" }, { version: "desc" }] }); const documentRequirements = enrollment.horarioActividad.actividad.requisitos.filter((link) => link.requisito.requiereDocumento); const requirements = documentRequirements.map((link) => { const history = rows.filter((row) => row.requisitoId === link.requisitoId).map(map); return { id: link.requisitoId, name: link.requisito.nombre, mandatory: link.obligatorio, instructions: link.observaciones || link.requisito.instrucciones, current: history[0] ?? null, history }; }); return { enrollment: { id: enrollment.id, status: enrollment.estado, activity: { id: enrollment.horarioActividad.actividad.id, name: enrollment.horarioActividad.actividad.nombre }, schedule: { day: enrollment.horarioActividad.diaSemana, startTime: enrollment.horarioActividad.horaInicio, endTime: enrollment.horarioActividad.horaFin } }, requirements, summary: calculateDocumentationSummary(requirements) }; }
export function calculateDocumentationSummary(requirements: Array<{ mandatory: boolean; current: { status: string; updatedAt?: Date | string | null } | null }>) { const mandatory = requirements.filter((item) => item.mandatory); let status: EnrollmentDocumentationStatus = "NO_REQUERIDA"; const missingCount = mandatory.filter((item) => !item.current).length, pendingReviewCount = mandatory.filter((item) => item.current?.status === "PENDIENTE").length, approvedCount = mandatory.filter((item) => item.current?.status === "APROBADO").length, rejectedCount = mandatory.filter((item) => item.current?.status === "RECHAZADO").length; if (mandatory.length) status = missingCount ? "PENDIENTE" : rejectedCount ? "OBSERVADA" : pendingReviewCount ? "EN_REVISION" : approvedCount === mandatory.length ? "COMPLETA" : "PENDIENTE"; const dates = mandatory.flatMap((item) => item.current?.updatedAt ? [new Date(item.current.updatedAt)] : []); return { status, requiredCount: mandatory.length, uploadedCount: mandatory.length - missingCount, pendingReviewCount, approvedCount, rejectedCount, missingCount, updatedAt: dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString() : null }; }

export async function getEnrollmentDocumentationSummaries(enrollmentIds: string[]) {
  if (!enrollmentIds.length) return new Map();

  const enrollments = await prisma.inscripcion.findMany({
    where: { id: { in: enrollmentIds } },
    select: {
      id: true,
      usuarioId: true,
      horarioActividad: {
        select: {
          actividad: {
            select: {
              requisitos: {
                where: { obligatorio: true, requisito: { requiereDocumento: true } },
                select: { requisitoId: true, requisito: { select: { nombre: true } } },
              },
            },
          },
        },
      },
    },
  });

  const userIds = [...new Set(enrollments.map((enrollment) => enrollment.usuarioId))];
  const requirementIds = [...new Set(enrollments.flatMap((enrollment) =>
    enrollment.horarioActividad.actividad.requisitos.map((requirement) => requirement.requisitoId),
  ))];
  const documents = await prisma.documentoUsuario.findMany({
    where: { usuarioId: { in: userIds }, requisitoId: { in: requirementIds } },
    select: {
      usuarioId: true,
      requisitoId: true,
      estado: true,
      fechaVencimiento: true,
      updatedAt: true,
    },
    orderBy: [{ requisitoId: "asc" }, { version: "desc" }],
  });
  const latestStates = new Map<string, string>();
  const latestDocuments = new Map<string, (typeof documents)[number]>();
  for (const document of documents) {
    const key = `${document.usuarioId}:${document.requisitoId}`;
    if (!latestStates.has(key)) latestStates.set(key, document.estado);
    if (!latestDocuments.has(key) && document.estado === "APROBADO" && latestStates.get(key) !== "RECHAZADO") latestDocuments.set(key, document);
  }
  return new Map(enrollments.map((enrollment) => {
    const requirements = enrollment.horarioActividad.actividad.requisitos.map((requirement) => {
      const current = latestDocuments.get(`${enrollment.usuarioId}:${requirement.requisitoId}`);
      return {
        mandatory: true,
        current: current ? { status: current.estado, updatedAt: current.updatedAt } : null,
      };
    });
    const summary = calculateDocumentationSummary(requirements);
    const missingRequirementNames = enrollment.horarioActividad.actividad.requisitos
      .filter((requirement) => !latestDocuments.has(`${enrollment.usuarioId}:${requirement.requisitoId}`))
      .map((requirement) => requirement.requisito.nombre);
    return [enrollment.id, { ...summary, missingRequirementNames }];
  }));
}

export async function uploadCitizenEnrollmentDocument(enrollmentId: string, userId: string, requirementId: string, file: File, observations?: string | null) { const enrollment = await enrollmentContext(enrollmentId, userId); const link = enrollment.horarioActividad.actividad.requisitos.find((item) => item.requisitoId === requirementId && item.requisito.requiereDocumento); if (!link) throw new CatalogValidationError("El requisito documental no corresponde a esta actividad."); if (!file.size) throw new CatalogValidationError("El archivo está vacío."); if (file.size > MAX_ENROLLMENT_DOCUMENT_BYTES) throw new CatalogValidationError("El archivo supera el máximo de 10 MB."); const expectedExtension = ALLOWED_ENROLLMENT_DOCUMENT_TYPES[file.type as keyof typeof ALLOWED_ENROLLMENT_DOCUMENT_TYPES]; const extension = extname(file.name).toLowerCase(); if (!expectedExtension || (file.type === "image/jpeg" ? ![".jpg", ".jpeg"].includes(extension) : extension !== expectedExtension)) throw new CatalogValidationError("El tipo o la extensión del archivo no están permitidos."); const content = Buffer.from(await file.arrayBuffer()); const storagePath = `enrollments/${enrollmentId}/${requirementId}/${randomUUID()}${expectedExtension}`; await uploadEnrollmentDocument(storagePath, content, file.type); try { return await prisma.$transaction(async (tx) => { await tx.$queryRaw`SELECT "id" FROM "Inscripcion" WHERE "id" = ${enrollmentId} FOR UPDATE`; const previous = await tx.documentoInscripcion.findMany({ where: { inscripcionId: enrollmentId, requisitoId: requirementId }, orderBy: { version: "desc" } }); if (previous.some((item) => item.estado === "PENDIENTE")) throw new CatalogConflictError("Ya existe un documento pendiente de revisión."); if (previous.some((item) => item.estado === "APROBADO")) throw new CatalogConflictError("El requisito ya posee un documento aprobado."); const row = await tx.documentoInscripcion.create({ data: { inscripcionId: enrollmentId, requisitoId: requirementId, version: (previous[0]?.version ?? 0) + 1, nombreOriginal: sanitizeOriginalName(file.name), storagePath, mimeType: file.type, extension, tamanioBytes: file.size, sha256: createHash("sha256").update(content).digest("hex"), requisitoNombreSnapshot: link.requisito.nombre, obligatorioSnapshot: link.obligatorio, instruccionesSnapshot: link.observaciones || link.requisito.instrucciones, observacionesCiudadano: observations?.trim() || null, subidoPorId: userId }, include }); return map(row); }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) { await removeEnrollmentDocument(storagePath).catch(() => undefined); throw error; } }
export async function removePendingCitizenDocument(enrollmentId: string, documentId: string, userId: string) { await enrollmentContext(enrollmentId, userId); const row = await prisma.documentoInscripcion.findFirst({ where: { id: documentId, inscripcionId: enrollmentId, inscripcion: { usuarioId: userId } } }); if (!row) throw new CatalogNotFoundError("Documento no encontrado."); if (row.estado !== "PENDIENTE" || row.revisadoAt) throw new CatalogValidationError("Solo podés retirar documentos pendientes sin revisar."); await removeEnrollmentDocument(row.storagePath); await prisma.documentoInscripcion.delete({ where: { id: row.id } }); }
export async function reviewEnrollmentDocument(id: string, reviewerId: string, input: ReviewEnrollmentDocumentInput) { return prisma.$transaction(async(tx)=>{const row = await tx.documentoInscripcion.findUnique({ where: { id },include }); if (!row) throw new CatalogNotFoundError("Documento no encontrado."); if (row.estado !== "PENDIENTE") throw new CatalogConflictError("El documento ya fue revisado."); const saved = await tx.documentoInscripcion.update({ where: { id }, data: { estado: input.status as DocumentoInscripcionEstado, motivoRechazo: input.status === "RECHAZADO" ? input.rejectionReason : null, observacionesRevision: input.reviewObservations, revisadoPorId: reviewerId, revisadoAt: new Date() }, include });const approved=input.status==="APROBADO";await createNotification({userId:row.inscripcion.usuarioId,type:approved?"DOCUMENTO_APROBADO":"DOCUMENTO_RECHAZADO",title:approved?"Documento aprobado":"Documento rechazado",message:approved?`Tu ${row.requisitoNombreSnapshot} para ${row.inscripcion.horarioActividad.actividad.nombre} fue aprobado.`:`Tu ${row.requisitoNombreSnapshot} fue rechazado. Revisá el motivo y adjuntá una nueva versión.`,priority:approved?"NORMAL":"ALTA",actionUrl:`/citizen/enrollments/${row.inscripcionId}/documents`,actionLabel:"Ver documentación",entityType:"enrollment_document",entityId:row.id,deduplicationKey:`document-${approved?"approved":"rejected"}:${row.id}:${row.version}`},tx);return map(saved);}); }
export async function updateEnrollmentDocumentObservations(id: string, value: string | null) { const row = await prisma.documentoInscripcion.findUnique({ where: { id } }); if (!row) throw new CatalogNotFoundError("Documento no encontrado."); return prisma.documentoInscripcion.update({ where: { id }, data: { observacionesRevision: value } }); }
export async function getSignedDocumentUrl(id: string, userId?: string) { const row = await prisma.documentoInscripcion.findFirst({ where: { id, ...(userId ? { inscripcion: { usuarioId: userId } } : {}) } }); if (!row) throw new CatalogNotFoundError("Documento no encontrado."); return createEnrollmentDocumentSignedUrl(row.storagePath); }
