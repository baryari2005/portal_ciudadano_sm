import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { CatalogNotFoundError } from "@/lib/errors/catalog-errors";

export const hashDigitalAccessQrToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

const toSummary = (credential: {
  estado: "ACTIVO" | "CONSUMIDO" | "REVOCADO";
  emitidoAt: Date;
  consumidoAt: Date | null;
  revocadoAt: Date | null;
} | null) => ({
  status: credential?.estado ?? "SIN_EMITIR",
  issuedAt: credential?.emitidoAt ?? null,
  consumedAt: credential?.consumidoAt ?? null,
  revokedAt: credential?.revocadoAt ?? null,
});

export async function issueDigitalAccessQr(userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.usuario.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new CatalogNotFoundError("Usuario no encontrado.");

    await tx.accesoQrDigital.updateMany({
      where: { usuarioId: userId, estado: "ACTIVO" },
      data: { estado: "REVOCADO", revocadoAt: new Date() },
    });

    const token = `masm_access_${randomBytes(32).toString("base64url")}`;
    const credential = await tx.accesoQrDigital.create({
      data: { usuarioId: userId, tokenHash: hashDigitalAccessQrToken(token) },
    });

    return { token, credential: toSummary(credential) };
  });
}

export async function getDigitalAccessQrStatus(userId: string) {
  const credential = await prisma.accesoQrDigital.findFirst({
    where: { usuarioId: userId },
    orderBy: { emitidoAt: "desc" },
  });
  return toSummary(credential);
}

export async function revokeDigitalAccessQr(userId: string) {
  await prisma.accesoQrDigital.updateMany({
    where: { usuarioId: userId, estado: "ACTIVO" },
    data: { estado: "REVOCADO", revocadoAt: new Date() },
  });
  return getDigitalAccessQrStatus(userId);
}
