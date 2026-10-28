import type { Prisma, PrismaClient } from "@prisma/client";
export type DatabaseClient = Prisma.TransactionClient | PrismaClient;
/** Reuse the caller's transaction so a workflow commits or rolls back as a unit. */
export function inTransaction<T>(db: DatabaseClient, action: (tx: Prisma.TransactionClient) => Promise<T>, options?: {maxWait?:number;timeout?:number}): Promise<T> {
  return "$transaction" in db ? db.$transaction(action,options) : action(db);
}
