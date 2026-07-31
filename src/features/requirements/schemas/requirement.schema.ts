import { z } from "zod";

export const REQUIREMENT_TYPES = ["INFORMACION", "DOCUMENTO", "CONSENTIMIENTO", "ELEMENTO_PERSONAL", "CONDICION"] as const;
export const REQUIREMENT_OBLIGATORINESS = ["OBLIGATORIO", "RECOMENDADO"] as const;
const optionalText = z.string().trim().optional().nullable().transform((value) => value || null);
const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug debe estar normalizado").optional();

const requirementFields = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre admite hasta 100 caracteres"),
  slug,
  descripcion: optionalText,
  tipo: z.enum(REQUIREMENT_TYPES),
  requiereDocumento: z.boolean().default(false),
  documentoPersonal: z.boolean().default(false),
  tieneVencimiento: z.boolean().default(false),
  vigenciaDias: z.coerce.number().int().positive().optional().nullable(),
  diasAvisoVencimiento: z.coerce.number().int().min(0).default(30),
  obligatoriedad: z.enum(REQUIREMENT_OBLIGATORINESS).default("OBLIGATORIO"),
  provistoPorInstitucion: z.boolean().default(false),
  requiereConfirmacion: z.boolean().default(false),
  controlarAlIngreso: z.boolean().default(false),
  aplicaEnCadaClase: z.boolean().default(false),
  instrucciones: optionalText,
  orden: z.coerce.number().int("El orden debe ser entero").min(0, "El orden no puede ser negativo").default(0),
  activo: z.boolean().default(true),
});

export const requirementSchema = requirementFields.superRefine((value, context) => {
  if (value.tipo === "DOCUMENTO" && value.tieneVencimiento && !value.vigenciaDias) {
    context.addIssue({ code: "custom", path: ["vigenciaDias"], message: "Indicá la vigencia del documento" });
  }
});

export const updateRequirementSchema = requirementFields.partial().refine(
  (value) => Object.values(value).some((field) => field !== undefined),
  "El PATCH debe incluir al menos un campo",
);

export const activityRequirementSchema = z.object({
  requisitoId: z.string().uuid("El requisito no es válido"),
  obligatorio: z.boolean().default(true),
  observaciones: optionalText,
  orden: z.coerce.number().int("El orden debe ser entero").default(0),
});

export const activityRequirementsSchema = z.array(activityRequirementSchema).refine(
  (items) => new Set(items.map((item) => item.requisitoId)).size === items.length,
  "Los requisitos no pueden repetirse",
);

export type RequirementInput = z.infer<typeof requirementSchema>;
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;
export type ActivityRequirementInput = z.infer<typeof activityRequirementSchema>;
