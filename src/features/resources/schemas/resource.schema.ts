import { z } from "zod";

export const RESOURCE_TYPES = ["ESPACIO", "CANCHA", "EQUIPAMIENTO", "COMPUTADORA", "ANDARIVEL", "OTRO"] as const;
export const RESOURCE_BOOKING_MODES = ["CAPACIDAD", "ESPECIFICO", "EXCLUSIVO"] as const;
export const RESOURCE_STATUSES = ["ACTIVO", "MANTENIMIENTO", "INACTIVO"] as const;

export const resourceSchema = z.object({
  establecimientoId: z.string().min(1, "Seleccioná un establecimiento"),
  nombre: z.string().trim().min(2).max(120),
  codigo: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  descripcion: z.string().trim().max(500).nullable().optional().transform((value) => value || null),
  tipo: z.enum(RESOURCE_TYPES),
  modoReserva: z.enum(RESOURCE_BOOKING_MODES),
  capacidadUnidades: z.coerce.number().int().min(1).max(10_000),
  estado: z.enum(RESOURCE_STATUSES).default("ACTIVO"),
});
export const updateResourceSchema = resourceSchema.partial().refine((value) => Object.values(value).some((field) => field !== undefined), "No hay cambios");
export type ResourceInput = z.infer<typeof resourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
