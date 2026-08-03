import { z } from "zod";
import { TIPOS_DOCUMENTO_OPCIONES } from "@/constants/tiposDocumento";
import { GENERO_OPCIONES } from "@/constants/genero";
import { ESTADO_CIVIL_OPCIONES } from "@/constants/estadocivil";
import { NACIONALIDAD_VALUES } from "@/constants/nacionalidad";
import {
  DOCUMENT_NUMBER_VALIDATION_MESSAGE,
  isValidDni,
} from "@/lib/validation/document";
import {
  EMAIL_VALIDATION_MESSAGE,
  isRequiredValidEmail,
} from "@/lib/validation/email";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validation/phone";

const onlyDigits = (s: string) => s.replace(/\D+/g, "");

const titleCaseEs = (s?: string) =>
  (s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(
      /([a-záéíóúüñ]+)([a-záéíóúüñ'-]*)/gi,
      (_m, p1: string, p2: string) =>
        p1.charAt(0).toUpperCase() + p1.slice(1) + p2,
    );

const CUIL_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

const isValidCuil = (v?: string) => {
  if (v == null || v === "") return true;
  const ds = onlyDigits(v);
  if (ds.length !== 11) return false;

  const nums = ds.split("").map((d) => parseInt(d, 10));
  const check = nums[10];
  const sum = CUIL_WEIGHTS.reduce((acc, w, i) => acc + w * nums[i], 0);

  let dv = 11 - (sum % 11);
  if (dv === 11) dv = 0;
  else if (dv === 10) dv = 9;

  return dv === check;
};

const cuilMatchesDni = (cuil?: string, dni?: string) => {
  const dc = onlyDigits(cuil || "");
  const dd = onlyDigits(dni || "");
  if (!dc || !dd) return true;
  if (dc.length !== 11) return true;
  return dc.slice(2, 10) === dd;
};

const ymd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado yyyy-MM-dd");

const BaseFields = z.object({
  userId: z.string().min(1, "Usuario requerido"),
  email: z.string().refine((value) => isRequiredValidEmail(value), {
    message: EMAIL_VALIDATION_MESSAGE,
  }),
  rolId: z.coerce.number().int().positive("Rol inválido"),
  nombre: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .transform((v) => titleCaseEs(v))
    .optional(),
  apellido: z
    .string()
    .max(100, "Máximo 100 caracteres")
    .transform((v) => titleCaseEs(v))
    .optional(),
  avatarUrl: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().url().optional(),
  ),
  fotoPerfilUrl: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().url().optional(),
  ),
  tipoDocumento: z.enum(TIPOS_DOCUMENTO_OPCIONES).optional(),
  documento: z
    .string()
    .refine((v) => v === "" || isValidDni(v), {
      message: DOCUMENT_NUMBER_VALIDATION_MESSAGE,
    })
    .optional(),
  cuil: z
    .string()
    .refine((v) => v === "" || isValidCuil(v), {
      message: "CUIL inválido",
    })
    .optional(),
  celular: z
    .string()
    .refine((v) => v === "" || isValidPhone(v), {
      message: PHONE_VALIDATION_MESSAGE,
    })
    .optional(),
  domicilio: z
    .string()
    .max(200, "Máximo 200 caracteres")
    .transform((v) => titleCaseEs(v))
    .optional(),
  domicilioPlaceId: z.string().nullable().optional(),
  localidad: z.string().max(100, "Máximo 100 caracteres").optional(),
  provincia: z.string().max(100, "Máximo 100 caracteres").optional(),
  domicilioLat: z.number().finite().nullable().optional(),
  domicilioLng: z.number().finite().nullable().optional(),
  codigoPostal: z.string().max(20, "Máximo 20 caracteres").optional(),
  contactoEmergenciaNombre: z.string().max(120).optional(),
  contactoEmergenciaTelefono: z.string().refine((v)=>v===""||isValidPhone(v),{message:PHONE_VALIDATION_MESSAGE}).optional(),
  coberturaMedicaId: z.string().uuid().nullable().optional(),
  numeroAfiliado: z.string().max(80).optional(),
  fechaNacimiento: ymd.nullable().optional(),
  genero: z.enum(GENERO_OPCIONES).optional(),
  estadoCivil: z.enum(ESTADO_CIVIL_OPCIONES).optional(),
  nacionalidad: z.enum(NACIONALIDAD_VALUES).optional(),
  profesorEspecialidad: z.string().max(160, "Máximo 160 caracteres").optional(),
  profesorMatricula: z.string().max(120, "Máximo 120 caracteres").optional(),
  profesorDescripcion: z.string().max(1200, "Máximo 1200 caracteres").optional(),
});

const createUserSchemaBase = BaseFields.extend({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombre: z
    .string()
    .trim()
    .min(1, "Nombre requerido")
    .max(100, "Máximo 100 caracteres")
    .transform((v) => titleCaseEs(v)),
  apellido: z
    .string()
    .trim()
    .min(1, "Apellido requerido")
    .max(100, "Máximo 100 caracteres")
    .transform((v) => titleCaseEs(v)),
  documento: z
    .string()
    .trim()
    .min(1, "DNI requerido")
    .refine((v) => isValidDni(v), {
      message: DOCUMENT_NUMBER_VALIDATION_MESSAGE,
    }),
  domicilio: z
    .string()
    .trim()
    .min(1, "Dirección requerida")
    .max(200, "Máximo 200 caracteres")
    .transform((v) => titleCaseEs(v)),
  localidad: z.string().trim().min(1, "Localidad requerida").max(100),
  provincia: z.string().trim().min(1, "Provincia requerida").max(100),
  codigoPostal: z.string().trim().min(1, "Código postal requerido").max(20),
  celular: z
    .string()
    .trim()
    .min(1, "Teléfono requerido")
    .refine((v) => isValidPhone(v), {
      message: PHONE_VALIDATION_MESSAGE,
    }),
  fechaNacimiento: ymd,
});

const editUserSchemaBase = BaseFields.extend({
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length === 0 || v.length >= 6, {
      message: "La contraseña debe tener al menos 6 caracteres",
    }),
});

function applyCrossChecks<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((val, ctx) => {
    const value = val as z.infer<typeof BaseFields> & { password?: string };

    if (
      value.cuil &&
      value.cuil !== "" &&
      value.documento &&
      value.documento !== "" &&
      !cuilMatchesDni(value.cuil, value.documento)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cuil"],
        message: "El CUIL no coincide con el DNI",
      });
    }
  });
}

export const createUserSchema = applyCrossChecks(createUserSchemaBase);
export const editUserSchema = applyCrossChecks(editUserSchemaBase);

export type CreateUserSchemaValues = z.infer<typeof createUserSchema>;
export type EditUserSchemaValues = z.infer<typeof editUserSchema>;
export type UserSchemaValues = z.infer<typeof BaseFields> & {
  password?: string;
};

export const userSchemaHelpers = {
  titleCaseEs,
  onlyDigits,
  isValidDni,
  isValidCuil,
  cuilMatchesDni,
  isValidPhone,
};
