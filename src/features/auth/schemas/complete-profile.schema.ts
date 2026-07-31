import { z } from "zod";
import {
  isRequiredValidPhone,
  PHONE_VALIDATION_MESSAGE,
} from "@/lib/validation/phone";

export const completeProfileSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  apellido: z.string().trim().min(1, "El apellido es obligatorio"),
  documento: z
    .string()
    .trim()
    .regex(/^\d+$/, "El DNI debe contener solo numeros")
    .min(7, "El DNI debe tener al menos 7 digitos")
    .max(8, "El DNI debe tener como maximo 8 digitos"),
  domicilio: z.string().trim().min(1, "La direccion es obligatoria"),
  celular: z
    .string()
    .trim()
    .min(1, "El telefono es obligatorio")
    .refine((value) => isRequiredValidPhone(value), {
      message: PHONE_VALIDATION_MESSAGE,
    }),
  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ingresa una fecha valida"),
});

export type CompleteProfileValues = z.infer<typeof completeProfileSchema>;
