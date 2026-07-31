import { z } from "zod";

export const forgotPasswordSchema = z
  .object({
    email: z.string().email().optional(),
    userId: z.string().min(1).optional(),
  })
  .refine((data) => data.email || data.userId, {
    message: "Debe enviar email o userId",
  });

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "La nueva clave debe tener al menos 8 caracteres")
    .regex(/[A-Za-z]/, "La nueva clave debe incluir al menos una letra")
    .regex(/[0-9]/, "La nueva clave debe incluir al menos un número"),
});
