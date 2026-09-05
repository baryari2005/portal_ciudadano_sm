import { z } from "zod";
import { EMAIL_VALIDATION_MESSAGE, isValidEmail } from "@/lib/validation/email";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validation/phone";

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export const horarioEstablecimientoSchema = z
  .object({
    id: z.string().optional(),
    diaSemana: z.string().min(1, "El dia es obligatorio"),
    horaApertura: z.string().min(1, "La hora de apertura es obligatoria"),
    horaCierre: z.string().min(1, "La hora de cierre es obligatoria"),
    cerrado: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.cerrado) {
      return;
    }

    if (timeToMinutes(value.horaApertura) >= timeToMinutes(value.horaCierre)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La hora de apertura debe ser menor a la hora de cierre",
        path: ["horaCierre"],
      });
    }
  });

export const establecimientoSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio"),
    direccion: z.string().trim().min(1, "La direccion es obligatoria"),
    localidad: z.string().trim().optional().nullable(),
    provincia: z.string().trim().optional().nullable(),
    direccionPlaceId: z.string().trim().optional().nullable(),
    direccionLat: z.number().finite().optional().nullable(),
    direccionLng: z.number().finite().optional().nullable(),
    codigoPostal: z.string().trim().optional().nullable(),
    imagenUrl: z.string().url("La imagen debe tener una URL válida").optional().nullable(),
    email: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine((value) => !value || isValidEmail(value), {
        message: EMAIL_VALIDATION_MESSAGE,
      }),
    telefono: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(
        (value) => {
          if (!value) {
            return true;
          }

          return isValidPhone(value);
        },
        { message: PHONE_VALIDATION_MESSAGE },
      ),
    celular: z.string().trim().optional().nullable().refine((value) => !value || isValidPhone(value), { message: PHONE_VALIDATION_MESSAGE }),
    estado: z.string().trim().default("activo"),
    observacion: z.string().trim().optional().nullable(),
    barrio: z.string().trim().optional().nullable(),
    horarios: z.array(horarioEstablecimientoSchema).default([]),
  })
  .superRefine((value, ctx) => {
    const openHorarios = value.horarios.filter((horario) => !horario.cerrado);

    for (let i = 0; i < openHorarios.length; i += 1) {
      for (let j = i + 1; j < openHorarios.length; j += 1) {
        const current = openHorarios[i];
        const next = openHorarios[j];

        if (current.diaSemana !== next.diaSemana) {
          continue;
        }

        const currentStart = timeToMinutes(current.horaApertura);
        const currentEnd = timeToMinutes(current.horaCierre);
        const nextStart = timeToMinutes(next.horaApertura);
        const nextEnd = timeToMinutes(next.horaCierre);

        if (currentStart < nextEnd && nextStart < currentEnd) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Hay franjas horarias superpuestas para el mismo dia",
            path: ["horarios"],
          });
          return;
        }
      }
    }
  });

export type EstablecimientoInput = z.infer<typeof establecimientoSchema>;
