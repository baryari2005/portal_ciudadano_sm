import { patchUserSchema } from "@/features/users/schemas/user.patch.schema";
import { DOCUMENT_NUMBER_VALIDATION_MESSAGE, isValidDni, normalizeDocumentNumber } from "@/lib/validation/document";

export const receptionCitizenPatchSchema = patchUserSchema.pick({
  email: true,
  nombre: true,
  apellido: true,
  avatarUrl: true,
  fotoPerfilUrl: true,
  celular: true,
  domicilio: true,
  localidad: true,
  provincia: true,
  domicilioPlaceId: true,
  domicilioLat: true,
  domicilioLng: true,
  codigoPostal: true,
  contactoEmergenciaNombre: true,
  contactoEmergenciaTelefono: true,
  coberturaMedicaId: true,
  numeroAfiliado: true,
  fechaNacimiento: true,
  genero: true,
  estadoCivil: true,
  nacionalidad: true,
  password: true,
}).extend({
  documento: patchUserSchema.shape.documento.refine((value) => value === undefined || (normalizeDocumentNumber(value).length > 0 && isValidDni(value)), {
    message: DOCUMENT_NUMBER_VALIDATION_MESSAGE,
  }).transform((value) => value == null ? value : normalizeDocumentNumber(value)),
}).strict();

export type ReceptionCitizenPatch = typeof receptionCitizenPatchSchema._output;
