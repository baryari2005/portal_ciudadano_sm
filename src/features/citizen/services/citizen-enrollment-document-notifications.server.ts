import type { Prisma } from "@prisma/client";
import { createNotification, notifyAdministrators } from "@/features/notifications/services/notifications.server";
import { getMissingDocumentRequirements } from "@/features/user-documents/helpers/document-display-status";
import { listCitizenUserDocuments } from "@/features/user-documents/services/user-documents.server";

type EnrollmentDocumentNotice = {
  enrollmentId: string;
  enrolledAt: Date;
  userId: string;
  citizenName: string;
  activityName: string;
  requiredDocumentIds: string[];
};

export async function notifyCitizenEnrollmentMissingDocuments(input: EnrollmentDocumentNotice, tx: Prisma.TransactionClient) {
  if (!input.requiredDocumentIds.length) return;
  const { requirements } = await listCitizenUserDocuments(input.userId, tx);
  const requiredIds = new Set(input.requiredDocumentIds);
  const missing = getMissingDocumentRequirements(requirements.filter((item) => requiredIds.has(item.id)), requirements);
  if (!missing.length) return;

  const names = new Intl.ListFormat("es-AR", { style: "long", type: "conjunction" }).format(missing.map((item) => item.name));
  // A re-enrollment may reuse the same row. Its enrollment date identifies the
  // successful enrollment occurrence, independently of later updates.
  const eventKey = `enrollment-missing-documents:${input.enrollmentId}:${input.enrolledAt.getTime()}`;
  const common = {
    type: "GENERAL" as const,
    priority: "NORMAL" as const,
    entityType: "enrollment",
    entityId: input.enrollmentId,
    metadata: { missingRequirementIds: missing.map((item) => item.id) },
  };
  await notifyAdministrators({
    ...common,
    senderId: input.userId,
    title: "Inscripción con documentación pendiente",
    message: `${input.citizenName} se inscribió a ${input.activityName} y todavía debe presentar: ${names}.`,
    actionUrl: `/user-documents?userId=${encodeURIComponent(input.userId)}`,
    actionLabel: "Ver documentación",
    deduplicationKey: `${eventKey}:admin`,
  }, tx);
  await createNotification({
    ...common,
    userId: input.userId,
    title: "Te falta presentar documentación",
    message: `Te inscribiste a ${input.activityName}. Todavía tenés que presentar: ${names}. Podés cargar la documentación desde Mis documentos.`,
    actionUrl: "/citizen/documents",
    actionLabel: "Ir a Mis documentos",
    deduplicationKey: `${eventKey}:citizen`,
  }, tx);
}
