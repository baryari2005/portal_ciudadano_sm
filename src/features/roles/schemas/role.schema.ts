import { z } from "zod";

export const createRoleSchema = z.object({
  codigo: z.string().min(2, "El código debe tener al menos 2 caracteres").regex(/^[a-z][a-z0-9_-]*$/, "Usá minúsculas, números, guiones o guiones bajos"),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  descripcion: z.string().nullable().optional(),
  activo: z.boolean().optional(),
  permisoIds: z.array(z.number().int().positive()).optional(),
});

export const updateRoleSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .optional(),
  descripcion: z.string().nullable().optional(),
  activo: z.boolean().optional(),
});

export const setPermissionsSchema = z.object({
  permisoIds: z.array(z.number().int().positive()),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>;
export type SetPermissionsDto = z.infer<typeof setPermissionsSchema>;
