import { prisma } from "@/lib/db";
import { legajoSchema, LegajoDto } from "../schemas/legajo.schema";
import { mapLegajoDbToDto, mapLegajoDtoToDb } from "../lib/legajo.mapper";

export async function ensureActiveUser(id: string) {
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });

  if (!user || user.deletedAt) {
    const error = new Error("Usuario no encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  return user;
}

export async function getLegajoByUserId(id: string) {
  await ensureActiveUser(id);

  const legajo = await prisma.legajo.findUnique({
    where: { usuarioId: id },
  });

  if (!legajo) return null;

  return mapLegajoDbToDto(legajo);
}

export function parseLegajoBody(body: unknown): LegajoDto {
  return legajoSchema.parse(body);
}

export async function upsertLegajoByUserId(id: string, dto: LegajoDto) {
  await ensureActiveUser(id);

  const data = {
    usuarioId: id,
    ...mapLegajoDtoToDb(dto),
  };

  const saved = await prisma.legajo.upsert({
    where: { usuarioId: id },
    update: data,
    create: data,
  });

  return mapLegajoDbToDto(saved);
}

export function mapLegajoError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues?: { message?: string }[] }).issues)
  ) {
    const issues = (error as { issues: { message?: string }[] }).issues;
    return {
      message:
        issues
          .map((i) => i.message)
          .filter(Boolean)
          .join(", ") || "Error de validación",
      status: 400,
    };
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error
  ) {
    return {
      message: String((error as { message: string }).message),
      status: Number((error as { status: number }).status) || 400,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Bad Request",
    status: 400,
  };
}
