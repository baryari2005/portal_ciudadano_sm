import { prisma } from "@/lib/db";
import { createAuditLog } from "@/features/audit-log/services/audit-log.server";
import { AUTH_IMAGES } from "@/features/auth/constants/auth-theme";
import type { GeneralSettings } from "../types/general-settings.types";
import { DEFAULT_EXPERIENCE_PALETTES } from "../constants/experience-palettes";
import { experiencePalettesSchema } from "../schemas/general-settings.schema";

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  pageSize: 6,
  loginCollageImages: [...AUTH_IMAGES.collage] as GeneralSettings["loginCollageImages"],
  experiencePalettes: structuredClone(DEFAULT_EXPERIENCE_PALETTES),
};

const map = (row: Awaited<ReturnType<typeof prisma.parametrosGenerales.findUnique>>): GeneralSettings => {
  const palettes = experiencePalettesSchema.safeParse(row?.paletasExperiencia);
  return {
    pageSize: row?.registrosPorPagina ?? DEFAULT_GENERAL_SETTINGS.pageSize,
    loginCollageImages: [
      row?.imagenLoginCollage1 || DEFAULT_GENERAL_SETTINGS.loginCollageImages[0],
      row?.imagenLoginCollage2 || DEFAULT_GENERAL_SETTINGS.loginCollageImages[1],
      row?.imagenLoginCollage3 || DEFAULT_GENERAL_SETTINGS.loginCollageImages[2],
      row?.imagenLoginCollage4 || DEFAULT_GENERAL_SETTINGS.loginCollageImages[3],
    ],
    experiencePalettes: palettes.success ? palettes.data : structuredClone(DEFAULT_EXPERIENCE_PALETTES),
  };
};

export async function getGeneralSettings() {
  return map(await prisma.parametrosGenerales.findUnique({ where: { id: 1 } }));
}

export async function updateGeneralSettings(input: GeneralSettings, actorId: string) {
  const previous = await getGeneralSettings();
  const row = await prisma.parametrosGenerales.upsert({
    where: { id: 1 },
    update: { registrosPorPagina: input.pageSize, imagenLoginCollage1: input.loginCollageImages[0], imagenLoginCollage2: input.loginCollageImages[1], imagenLoginCollage3: input.loginCollageImages[2], imagenLoginCollage4: input.loginCollageImages[3], paletasExperiencia: input.experiencePalettes, updatedById: actorId },
    create: { id: 1, registrosPorPagina: input.pageSize, imagenLoginCollage1: input.loginCollageImages[0], imagenLoginCollage2: input.loginCollageImages[1], imagenLoginCollage3: input.loginCollageImages[2], imagenLoginCollage4: input.loginCollageImages[3], paletasExperiencia: input.experiencePalettes, updatedById: actorId },
  });
  const next = map(row);
  await createAuditLog({ actorId, action: "EDITAR", entityType: "PARAMETROS_GENERALES", entityId: "1", entityName: "Parámetros generales", changes: { previous, next }, origin: "ADMINISTRACION" });
  return next;
}
