import { prisma } from "@/lib/db";
import { createNotification } from "@/features/notifications/services/notifications.server";

const DAY_MS = 86_400_000;

function startOfUtcDay(value = new Date()) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export async function ensureDocumentExpirationNotifications(userId: string) {
  const documents = await prisma.documentoUsuario.findMany({
    where: {
      usuarioId: userId,
      estado: "APROBADO",
      fechaVencimiento: { not: null },
      requisito: { activo: true, tieneVencimiento: true },
    },
    include: { requisito: true },
    orderBy: [{ requisitoId: "asc" }, { version: "desc" }],
  });

  const latest = new Map<string, (typeof documents)[number]>();
  for (const document of documents) {
    if (!latest.has(document.requisitoId)) latest.set(document.requisitoId, document);
  }

  const today = startOfUtcDay();
  for (const document of latest.values()) {
    if (!document.fechaVencimiento) continue;
    const expiration = startOfUtcDay(document.fechaVencimiento);
    const daysRemaining = Math.ceil((expiration.getTime() - today.getTime()) / DAY_MS);
    const warningDays = document.requisito.diasAvisoVencimiento;
    if (daysRemaining > warningDays) continue;

    const expired = daysRemaining < 0;
    const date = expiration.toLocaleDateString("es-AR", { timeZone: "UTC" });
    await createNotification({
      userId,
      type: "GENERAL",
      title: expired ? "Documento vencido" : "Documento próximo a vencer",
      message: expired
        ? `Tu documento ${document.requisitoNombreSnapshot} venció el ${date}. Cargá una nueva versión cuando la tengas disponible.`
        : `Tu documento ${document.requisitoNombreSnapshot} vence el ${date}. Podés cargar una nueva versión con anticipación.`,
      priority: expired ? "ALTA" : "NORMAL",
      actionUrl: "/citizen/documents",
      actionLabel: "Ver mis documentos",
      entityType: "user_document",
      entityId: document.id,
      deduplicationKey: `user-document-${expired ? "expired" : "expiring"}:${document.id}:${expiration.toISOString().slice(0, 10)}`,
    });
  }
}

export async function processDocumentExpirationNotifications() {
  const users = await prisma.documentoUsuario.findMany({
    where: { estado: "APROBADO", fechaVencimiento: { not: null }, usuario: { estado: "ACTIVO", deletedAt: null } },
    distinct: ["usuarioId"],
    select: { usuarioId: true },
  });
  for (const { usuarioId } of users) await ensureDocumentExpirationNotifications(usuarioId);
  return { processedUsers: users.length };
}

export function getDocumentValidity(expiresAt: Date | string | null, warningDays: number) {
  if (!expiresAt) return "SIN_VENCIMIENTO" as const;
  const daysRemaining = Math.ceil((startOfUtcDay(new Date(expiresAt)).getTime() - startOfUtcDay().getTime()) / DAY_MS);
  if (daysRemaining < 0) return "VENCIDO" as const;
  if (daysRemaining <= warningDays) return "PROXIMO_A_VENCER" as const;
  return "VIGENTE" as const;
}
