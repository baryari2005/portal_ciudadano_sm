import { z } from "zod";
import { Genero } from "@prisma/client";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null);

const optionalSlug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(slugRegex, "El slug debe estar normalizado")
  .optional();

export const publicoObjetivoSchema = z.object({
    nombre: z
      .string()
      .trim()
      .min(1, "El nombre es obligatorio")
      .max(80, "El nombre no puede superar los 80 caracteres"),
    slug: optionalSlug,
    descripcion: optionalText,
    edadMinimaSugerida: z.coerce.number().int().min(0).max(120).optional().nullable(),
    edadMaximaSugerida: z.coerce.number().int().min(0).max(120).optional().nullable(),
    generosAdmitidos: z.array(z.nativeEnum(Genero)).default([]),
    orden: z.coerce
      .number()
      .int("El orden debe ser un número entero")
      .default(0),
    activo: z.boolean().default(true),
  }).superRefine((value, context) => {
    if (value.edadMinimaSugerida != null && value.edadMaximaSugerida != null && value.edadMinimaSugerida > value.edadMaximaSugerida) context.addIssue({ code: "custom", path: ["edadMaximaSugerida"], message: "La edad máxima debe ser mayor o igual a la mínima" });
  });

export const updatePublicoObjetivoSchema = publicoObjetivoSchema.partial();

export type PublicoObjetivoInput = z.infer<typeof publicoObjetivoSchema>;
export type UpdatePublicoObjetivoInput = z.infer<
  typeof updatePublicoObjetivoSchema
>;
