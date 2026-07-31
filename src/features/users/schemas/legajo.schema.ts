// legajo.schema.ts
import { z } from "zod";

export const EMPLOYMENT_STATUS = [
  "ACTIVO",
  "SUSPENDIDO",
  "LICENCIA",
  "BAJA",
] as const;
export const CONTRACT_TYPES = [
  "INDETERMINADO",
  "PLAZO_FIJO",
  "TEMPORAL",
  "PASANTIA",
  "MONOTRIBUTO",
] as const;

/** Acepta string, "", null o undefined y normaliza a string | null */
const looseText = (max = 120) =>
  z
    .union([z.string(), z.literal(""), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) return null;
      const s = String(v).trim();
      return s === "" ? null : s;
    })
    .refine((v) => v === null || typeof v === "string", {
      message: "Texto inválido",
    })
    .refine((v) => v === null || v.length <= max, {
      message: `Máximo ${max} caracteres`,
    });

const MATRICULA_RE = /^[A-Z0-9 .\-\/]+$/i;
const looseMatricula = z
  .union([z.string(), z.literal(""), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const s = String(v).trim().toUpperCase();
    return s === "" ? null : s;
  })
  .refine((v) => v === null || MATRICULA_RE.test(v), {
    message: "Formato inválido",
  });

export const legajoSchema = z.object({
  employeeNumber: z.union([
    z.number().int().positive(),
    z.null(),
    z.undefined(),
  ]),

  // YYYY-MM-DD | null | undefined
  admissionDate: z.union([z.string(), z.null(), z.undefined()]),
  terminationDate: z.union([z.string(), z.null(), z.undefined()]),

  employmentStatus: z.enum(EMPLOYMENT_STATUS),
  contractType: z.union([z.enum(CONTRACT_TYPES), z.null(), z.undefined()]),

  position: looseText(120),
  area: looseText(120),
  department: looseText(120),
  category: looseText(120),

  matriculaProvincial: looseMatricula,
  matriculaNacional: looseMatricula,

  notes: looseText(1000),
});

export type LegajoValues = z.infer<typeof legajoSchema>;
