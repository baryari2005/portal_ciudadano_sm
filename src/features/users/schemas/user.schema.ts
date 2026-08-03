import { z } from "zod";
import {
  EstadoCivil,
  Genero,
  Nacionalidad,
  TipoDocumento,
} from "@prisma/client";
import {
  EMAIL_VALIDATION_MESSAGE,
  isRequiredValidEmail,
} from "@/lib/validation/email";

export const createUserSchema = z.object({
  userId: z.string().min(1),
  email: z.string().refine((value) => isRequiredValidEmail(value), {
    message: EMAIL_VALIDATION_MESSAGE,
  }),
  password: z.string().min(6),
  rolId: z.number().int().positive(),

  // Personales / contacto
  nombre: z.string().optional().nullable(),
  apellido: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  fotoPerfilUrl: z.string().url().optional().nullable(),
  celular: z.string().optional().nullable(),
  domicilio: z.string().optional().nullable(),
  localidad: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  domicilioPlaceId: z.string().optional().nullable(),
  domicilioLat: z.number().finite().optional().nullable(),
  domicilioLng: z.number().finite().optional().nullable(),
  codigoPostal: z.string().optional().nullable(),
  contactoEmergenciaNombre: z.string().optional().nullable(),
  contactoEmergenciaTelefono: z.string().optional().nullable(),
  coberturaMedicaId: z.string().uuid().optional().nullable(),
  numeroAfiliado: z.string().optional().nullable(),

  // Identidad
  tipoDocumento: z.nativeEnum(TipoDocumento).optional().nullable(),
  documento: z.string().optional().nullable(),
  cuil: z.string().optional().nullable(),

  // Demográficos
  fechaNacimiento: z.coerce.date().optional().nullable(),
  genero: z.nativeEnum(Genero).optional().nullable(),
  estadoCivil: z.nativeEnum(EstadoCivil).optional().nullable(),
  nacionalidad: z.nativeEnum(Nacionalidad).optional().nullable(),
  professorProfile: z.object({
    especialidad: z.string().trim().max(160).optional().nullable(),
    matricula: z.string().trim().max(120).optional().nullable(),
    descripcion: z.string().trim().max(1200).optional().nullable(),
  }).optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
