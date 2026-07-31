import { z } from "zod";
import {
  EstadoCivil,
  Genero,
  Nacionalidad,
  TipoDocumento,
  EstadoUsuario,
} from "@prisma/client";
import { EMAIL_VALIDATION_MESSAGE, isValidEmail } from "@/lib/validation/email";

export const patchUserSchema = z.object({
  userId: z.string().min(1).optional(),
  email: z
    .string()
    .optional()
    .refine((value) => !value || isValidEmail(value), {
      message: EMAIL_VALIDATION_MESSAGE,
    }),
  password: z.string().min(6).optional(),
  rolId: z.number().int().positive().optional(),
  estado: z.nativeEnum(EstadoUsuario).optional(),
  perfilCompleto: z.boolean().optional(),

  nombre: z.string().nullable().optional(),
  apellido: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  fotoPerfilUrl: z.string().url().nullable().optional(),
  celular: z.string().nullable().optional(),
  domicilio: z.string().nullable().optional(),
  localidad: z.string().nullable().optional(),
  provincia: z.string().nullable().optional(),
  domicilioPlaceId: z.string().nullable().optional(),
  domicilioLat: z.number().finite().nullable().optional(),
  domicilioLng: z.number().finite().nullable().optional(),
  codigoPostal: z.string().nullable().optional(),
  contactoEmergenciaNombre: z.string().nullable().optional(),
  contactoEmergenciaTelefono: z.string().nullable().optional(),
  coberturaMedicaId: z.string().uuid().nullable().optional(),
  numeroAfiliado: z.string().nullable().optional(),

  tipoDocumento: z.nativeEnum(TipoDocumento).nullable().optional(),
  documento: z.string().nullable().optional(),
  cuil: z.string().nullable().optional(),

  fechaNacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado yyyy-MM-dd")
    .nullable()
    .optional(),
  genero: z.nativeEnum(Genero).nullable().optional(),
  estadoCivil: z.nativeEnum(EstadoCivil).nullable().optional(),
  nacionalidad: z.nativeEnum(Nacionalidad).nullable().optional(),
});

export type PatchUserDto = z.infer<typeof patchUserSchema>;
