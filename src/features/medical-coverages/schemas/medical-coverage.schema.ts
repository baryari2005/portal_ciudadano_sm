import { z } from "zod";
export const medicalCoverageSchema=z.object({nombre:z.string().trim().min(2).max(120),imagenUrl:z.string().url().optional().nullable(),tipo:z.enum(["OBRA_SOCIAL","PREPAGA"]),activo:z.boolean().default(true)});
export type MedicalCoverageInput=z.infer<typeof medicalCoverageSchema>;
