import { z } from "zod";

export const profesorEstados = ["ACTIVO", "INACTIVO", "SUSPENDIDO"] as const;
export const profesorEstadoSchema = z.enum(profesorEstados);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const fotoUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Ingresá una URL http(s) o una ruta interna válida.");

const profileFields = {
  especialidad: optionalText(160),
  descripcion: optionalText(1200),
  matricula: optionalText(120),
  fotoUrl: fotoUrlSchema
    .transform((value) => value || null)
    .nullable()
    .optional(),
};

export const createProfesorSchema = z
  .object({
    usuarioId: z.string().uuid("Seleccioná un usuario válido."),
    ...profileFields,
    estado: profesorEstadoSchema.default("ACTIVO"),
  })
  .strict();

export const updateProfesorSchema = z
  .object(profileFields)
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "No se informaron cambios.",
  );

export const changeProfesorEstadoSchema = z
  .object({
    estado: profesorEstadoSchema,
  })
  .strict();

export const profesorFiltersSchema = z.object({
  search: z.string().trim().max(160).optional(),
  estado: profesorEstadoSchema.optional(),
  especialidad: z.string().trim().max(160).optional(),
  usuarioId: z.string().uuid().optional(),
  orderBy: z
    .enum(["nombre", "apellido", "especialidad", "createdAt", "updatedAt"])
    .default("apellido"),
  orderDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export type CreateProfesorInput = z.infer<typeof createProfesorSchema>;
export type UpdateProfesorInput = z.infer<typeof updateProfesorSchema>;
export type ProfesorFilters = z.infer<typeof profesorFiltersSchema>;
