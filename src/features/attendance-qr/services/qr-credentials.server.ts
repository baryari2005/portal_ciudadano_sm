import { createHash, randomBytes } from "node:crypto";
import { createNotification } from "@/features/notifications/services/notifications.server";
import { prisma } from "@/lib/db";
import { CatalogNotFoundError, CatalogValidationError } from "@/lib/errors/catalog-errors";
import { decryptQrToken, encryptQrToken } from "./qr-token-encryption.server";

export const hashQrToken = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");
const summary = (row: { estado?: string; emitidoAt?: Date | null; ultimoUsoAt?: Date | null; tokenCifrado?: string | null } | null) => ({ status: row?.estado ?? "SIN_EMITIR", issuedAt: row?.emitidoAt ?? null, lastUsedAt: row?.ultimoUsoAt ?? null, token: decryptQrToken(row?.tokenCifrado) });

export async function issueUserQrCredential(userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.usuario.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new CatalogNotFoundError("Usuario no encontrado.");
    await tx.usuarioQrCredencial.updateMany({ where: { usuarioId: userId, estado: "ACTIVO" }, data: { estado: "REVOCADO", revocadoAt: new Date() } });
    const token = `masm_qr_${randomBytes(32).toString("base64url")}`;
    const tokenCifrado = encryptQrToken(token);
    const row = await tx.usuarioQrCredencial.create({ data: { usuarioId: userId, tokenHash: hashQrToken(token) } });
    await tx.$executeRaw`UPDATE "UsuarioQrCredencial" SET "tokenCifrado" = ${tokenCifrado} WHERE "id" = ${row.id}`;
    await createNotification({ userId, type: "QR_EMITIDO", title: "Credencial QR emitida", message: "Tu credencial QR fue emitida correctamente.", priority: "BAJA", actionUrl: "/citizen/qr", actionLabel: "Ver mi QR", entityType: "qr_credential", entityId: row.id, deduplicationKey: `qr-issued:${row.id}` }, tx);
    return { token, credential: summary({ ...row, tokenCifrado }) };
  });
}

export async function revokeUserQrCredential(userId: string) {
  return prisma.$transaction(async (tx) => {
    const active = await tx.usuarioQrCredencial.findFirst({ where: { usuarioId: userId, estado: "ACTIVO" } });
    if (!active) throw new CatalogValidationError("El usuario no tiene una credencial activa.");
    await tx.usuarioQrCredencial.update({ where: { id: active.id }, data: { estado: "REVOCADO", revocadoAt: new Date() } });
    await createNotification({ userId, type: "QR_REVOCADO", title: "Credencial QR revocada", message: "Tu credencial QR fue revocada.", priority: "BAJA", actionUrl: "/citizen/qr", actionLabel: "Ver mi QR", entityType: "qr_credential", entityId: active.id, deduplicationKey: `qr-revoked:${active.id}` }, tx);
    return summary(await tx.usuarioQrCredencial.findFirst({ where: { usuarioId: userId }, orderBy: { emitidoAt: "desc" } }));
  });
}

export async function getUserQrStatus(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ estado: string; emitidoAt: Date; ultimoUsoAt: Date | null; tokenCifrado: string | null }>>`
    SELECT "estado", "emitidoAt", "ultimoUsoAt", "tokenCifrado"
    FROM "UsuarioQrCredencial"
    WHERE "usuarioId" = ${userId}::uuid
    ORDER BY "emitidoAt" DESC
    LIMIT 1
  `;
  return summary(rows[0] ?? null);
}
