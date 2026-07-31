import { z } from "zod";

export const accessRequestReviewSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("APPROVE") }),
  z.object({
    decision: z.literal("REJECT"),
    rejectionReason: z
      .string()
      .trim()
      .min(10, "El motivo debe tener al menos 10 caracteres.")
      .max(500, "El motivo no puede superar los 500 caracteres."),
  }),
]);
