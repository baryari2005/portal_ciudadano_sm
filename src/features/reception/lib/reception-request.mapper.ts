import type { UpsertUserDto } from "@/features/users/services/api.service";
import type { UserFormValues } from "@/features/users/types/types";

function optionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export type ReceptionRequestPayload = Omit<
  UpsertUserDto,
  "rolId" | "avatarUrl" | "fotoPerfilUrl"
>;

export function toReceptionRequestPayload(
  values: UserFormValues,
): ReceptionRequestPayload {
  return {
    userId: values.userId.trim(),
    email: values.email.trim().toLowerCase(),
    password: values.password,
    nombre: values.nombre?.trim(),
    apellido: values.apellido?.trim(),
    fechaNacimiento: values.fechaNacimiento ?? undefined,
    genero: values.genero,
    estadoCivil: values.estadoCivil,
    nacionalidad: values.nacionalidad,
    tipoDocumento: values.tipoDocumento,
    documento: optionalText(values.documento),
    cuil: optionalText(values.cuil),
    celular: optionalText(values.celular),
    domicilio: optionalText(values.domicilio),
    localidad: optionalText(values.localidad),
    provincia: optionalText(values.provincia),
    domicilioPlaceId: values.domicilioPlaceId ?? undefined,
    domicilioLat: values.domicilioLat ?? undefined,
    domicilioLng: values.domicilioLng ?? undefined,
    codigoPostal: optionalText(values.codigoPostal),
    contactoEmergenciaNombre: optionalText(values.contactoEmergenciaNombre),
    contactoEmergenciaTelefono: optionalText(
      values.contactoEmergenciaTelefono,
    ),
    coberturaMedicaId: values.coberturaMedicaId ?? undefined,
    numeroAfiliado: optionalText(values.numeroAfiliado),
  };
}
