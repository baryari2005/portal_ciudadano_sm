import { z } from "zod";

export const reserveClassSchema = z.object({ classId: z.string().min(1) });
export const cancelClassReservationSchema = z.object({
  reason: z.string().trim().min(3, "Indicá el motivo").max(500),
  proofUrl: z.string().trim().url().nullable().optional(),
});
export const participationPolicySchema = z.object({
  justifiedAbsenceThreshold: z.number().int().min(1).max(100).nullable(),
  unjustifiedAbsenceThreshold: z.number().int().min(1).max(100).nullable(),
  status: z.enum(["HABILITADO", "EN_REVISION", "SUSPENDIDO_PROVISORIO"]),
  observations: z.string().trim().max(1000).nullable().optional(),
});
