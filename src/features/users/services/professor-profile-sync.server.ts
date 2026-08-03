import type { Prisma } from "@prisma/client";

export type EmbeddedProfessorProfile = {
  especialidad?: string | null;
  matricula?: string | null;
  descripcion?: string | null;
};

const clean = (value?: string | null) => value?.trim() || null;

export async function syncProfessorProfile(tx: Prisma.TransactionClient, userId: string, roleId: number, profile: EmbeddedProfessorProfile | undefined) {
  if (!profile) return;
  const role = await tx.rol.findUnique({ where: { id: roleId }, select: { codigo: true, nombre: true } });
  const code = role?.codigo?.trim().toLowerCase();
  const name = role?.nombre.trim().toLowerCase();
  if (!["teacher", "profesor"].includes(code ?? "") && name !== "profesor") {
    const error = new Error("Los datos profesionales solo pueden guardarse para usuarios con rol Profesor.");
    (error as Error & { status?: number }).status = 422;
    throw error;
  }
  await tx.profesor.upsert({
    where: { usuarioId: userId },
    create: { usuarioId: userId, especialidad: clean(profile.especialidad), matricula: clean(profile.matricula), descripcion: clean(profile.descripcion), estado: "ACTIVO" },
    update: { especialidad: clean(profile.especialidad), matricula: clean(profile.matricula), descripcion: clean(profile.descripcion), estado: "ACTIVO" },
  });
}
