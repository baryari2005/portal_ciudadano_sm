import { z } from "zod";

import { createUserSchema } from "@/features/users/schemas/schemas";

const optionalEnumFields = [
  "genero",
  "estadoCivil",
  "nacionalidad",
  "tipoDocumento",
] as const;

/**
 * Recepción comparte las validaciones del alta de usuarios, pero representa los
 * enums opcionales ausentes como `undefined`, no como `null`.
 */
export const receptionRequestSchema = z.preprocess((value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const normalized: Record<string, unknown> = { ...value };
  for (const field of optionalEnumFields) {
    if (normalized[field] === null || normalized[field] === "") {
      delete normalized[field];
    }
  }

  return normalized;
}, createUserSchema);

export type ReceptionRequestInput = z.infer<typeof receptionRequestSchema>;
