import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string().min(1, "Ingrese su usuario"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export type LoginSchemaValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "El email es obligatorio")
    .email("Email inválido"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra")
      .regex(/[0-9]/, "La contraseña debe incluir al menos un número"),
    confirm: z.string().min(8, "Confirmación requerida"),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
