import { NACIONALIDAD_VALUES } from "@/constants/nacionalidad";

export type UserFormValues = {
  userId: string;
  email: string;
  password?: string;
  rolId: number;

  nombre?: string;
  apellido?: string;
  avatarUrl?: string;
  fotoPerfilUrl?: string;

  tipoDocumento?: "DNI" | "PAS" | "LE" | "LC" | "CI";
  documento?: string;
  cuil?: string;

  celular?: string;
  domicilio?: string;
  localidad?: string;
  provincia?: string;
  domicilioPlaceId?: string | null;
  domicilioLat?: number | null;
  domicilioLng?: number | null;
  codigoPostal?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  coberturaMedicaId?: string | null;
  numeroAfiliado?: string;

  fechaNacimiento?: string | null;
  genero?:
    "MASCULINO" | "FEMENINO" | "NO_BINARIO" | "PREFIERE_NO_DECIR" | "OTRO";
  estadoCivil?:
    | "SOLTERO"
    | "CASADO"
    | "DIVORCIADO"
    | "VIUDO"
    | "UNION_CONVIVENCIAL"
    | "OTRO";
  nacionalidad?: (typeof NACIONALIDAD_VALUES)[number];
  profesorEspecialidad?: string;
  profesorMatricula?: string;
  profesorDescripcion?: string;
};

export type Role = { id: number; nombre: string; codigo?: string };

export type UserDTO = {
  id: string;
  userId: string;
  email: string;
  nombre?: string | null;
  apellido?: string | null;
  avatarUrl?: string | null;
  fotoPerfilUrl?: string | null;
  rolId: number;
  rol?: Role | null;
  estado?: "PENDIENTE" | "ACTIVO" | "RECHAZADO" | "BLOQUEADO";
  perfilCompleto?: boolean;
  tipoDocumento?: UserFormValues["tipoDocumento"] | null;
  documento?: string | null;
  cuil?: string | null;
  celular?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  codigoPostal?: string | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string | null;
  coberturaMedicaId?: string | null;
  numeroAfiliado?: string | null;
  fechaNacimiento?: string | null;
  genero?: UserFormValues["genero"] | null;
  estadoCivil?: UserFormValues["estadoCivil"] | null;
  nacionalidad?: UserFormValues["nacionalidad"] | null;
  profesor?: { especialidad?: string | null; matricula?: string | null; descripcion?: string | null } | null;
};

export type UserRow = {
  id: string;
  userId: string;
  email: string;
  nombre?: string | null;
  apellido?: string | null;
  avatarUrl?: string | null;
  rol?: { id: number; nombre: string } | null;
  estado?: "PENDIENTE" | "ACTIVO" | "RECHAZADO" | "BLOQUEADO";
  perfilCompleto?: boolean;
};
