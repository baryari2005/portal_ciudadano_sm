import { z } from "zod";
import { EstadoLaboral, TipoContrato } from "@prisma/client";

export const legajoSchema = z
  .object({
    employeeNumber: z.number().int().positive().optional().nullable(),
    admissionDate: z.string().optional().nullable(),
    terminationDate: z.string().optional().nullable(),
    employmentStatus: z.nativeEnum(EstadoLaboral),
    contractType: z.nativeEnum(TipoContrato).optional().nullable(),
    position: z.string().optional().nullable(),
    area: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    matriculaProvincial: z.string().optional().nullable(),
    matriculaNacional: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .strict();

export type LegajoDto = z.infer<typeof legajoSchema>;
