import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColorRegex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

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

export const categoriaActividadSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "El nombre no puede superar los 80 caracteres"),
  slug: optionalSlug,
  descripcion: optionalText,
  color: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((value) => !value || hexColorRegex.test(value), {
      message: "El color debe ser hexadecimal",
    })
    .transform((value) => value || null),
  icono: optionalText,
  orden: z.coerce.number().int("El orden debe ser un número entero").default(0),
  activo: z.boolean().default(true),
});

export const updateCategoriaActividadSchema =
  categoriaActividadSchema.partial();

export type CategoriaActividadInput = z.infer<typeof categoriaActividadSchema>;
export type UpdateCategoriaActividadInput = z.infer<
  typeof updateCategoriaActividadSchema
>;
