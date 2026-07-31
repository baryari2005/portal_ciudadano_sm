import { z } from "zod";
import {
  EMAIL_VALIDATION_MESSAGE,
  isRequiredValidEmail,
} from "@/lib/validation/email";
import {
  isRequiredValidPhone,
  PHONE_VALIDATION_MESSAGE,
} from "@/lib/validation/phone";
import { GENERO_OPCIONES } from "@/constants/genero";
import { NACIONALIDAD_VALUES } from "@/constants/nacionalidad";

const requiredMessage = "Este campo es obligatorio";

export const requestAccessSchema = z.object({
  nombre: z.string().trim().min(1, requiredMessage),
  apellido: z.string().trim().min(1, requiredMessage),
  genero: z.enum(GENERO_OPCIONES, { message: requiredMessage }),
  nacionalidad: z.enum(NACIONALIDAD_VALUES, { message: requiredMessage }),
  dni: z
    .string()
    .trim()
    .min(1, requiredMessage)
    .regex(/^\d+$/, "El DNI debe contener solo números")
    .min(7, "El DNI debe tener al menos 7 dígitos")
    .max(8, "El DNI debe tener como máximo 8 dígitos"),
  direccion: z.string().trim().min(1, requiredMessage),
  localidad: z.string().trim().min(1, requiredMessage).max(100),
  provincia: z.string().trim().min(1, requiredMessage).max(100),
  codigoPostal: z.string().trim().min(1, requiredMessage).max(20),
  direccionPlaceId: z.string().trim().optional().default(""),
  direccionLat: z.number().finite().nullable().optional().default(null),
  direccionLng: z.number().finite().nullable().optional().default(null),
  email: z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => isRequiredValidEmail(value), {
      message: EMAIL_VALIDATION_MESSAGE,
    })
    .transform((value) => value.toLowerCase()),
  telefono: z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => isRequiredValidPhone(value), {
      message: PHONE_VALIDATION_MESSAGE,
    }),
  contactoEmergenciaNombre: z.string().trim().min(1, requiredMessage).max(120),
  contactoEmergenciaTelefono: z.string().trim().min(1, requiredMessage).refine((value)=>isRequiredValidPhone(value),{message:PHONE_VALIDATION_MESSAGE}),
  coberturaMedicaId: z.string().uuid().nullable().optional().default(null),
  numeroAfiliado: z.string().trim().max(80).optional().default(""),
  fechaNacimiento: z
    .string()
    .trim()
    .min(1, requiredMessage)
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Seleccioná una fecha válida",
    }),
  userId: z
    .string()
    .trim()
    .min(1, requiredMessage)
    .min(4, "El User ID debe tener al menos 4 caracteres")
    .max(30, "El User ID debe tener como máximo 30 caracteres")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "El User ID solo puede contener letras, números, punto, guion y guion bajo",
    )
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(1, requiredMessage)
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  profilePhotoTmpPath: z.string().trim().optional().default(""),
  avatarTmpPath: z.string().trim().optional().default(""),
});

export type RequestAccessFormValues = z.input<typeof requestAccessSchema>;
export type RequestAccessPayload = z.output<typeof requestAccessSchema>;
