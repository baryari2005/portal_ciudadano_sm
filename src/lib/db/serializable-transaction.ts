import { Prisma, type PrismaClient } from "@prisma/client";

/** PostgreSQL may abort a competing serializable transaction after a row lock. */
export async function serializableTransaction<T>(database: Pick<PrismaClient, "$transaction">, work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await database.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error;
    }
  }
  throw new Error("No se pudo completar la transacción.");
}
