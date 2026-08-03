import { axiosInstance } from "@/lib/axios";
import { Role, UserDTO, UserFormValues } from "../types/types";

export type UpsertUserDto = {
  userId: string;
  email: string;
  password?: string;
  rolId: number;

  nombre?: string | null;
  apellido?: string | null;
  avatarUrl?: string | null;
  fotoPerfilUrl?: string | null;

  tipoDocumento?: UserFormValues["tipoDocumento"] | null;
  documento?: string | null;
  cuil?: string | null;

  celular?: string | null;
  domicilio?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  domicilioPlaceId?: string | null;
  domicilioLat?: number | null;
  domicilioLng?: number | null;
  codigoPostal?: string | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string | null;
  coberturaMedicaId?: string | null;
  numeroAfiliado?: string | null;

  fechaNacimiento?: string | null;
  genero?: UserFormValues["genero"] | null;
  estadoCivil?: UserFormValues["estadoCivil"] | null;
  nacionalidad?: UserFormValues["nacionalidad"] | null;
  professorProfile?: { especialidad?: string | null; matricula?: string | null; descripcion?: string | null };
};

export async function listRoles(): Promise<Role[]> {
  const { data } = await axiosInstance.get("/roles", {
    params: { page: 1, pageSize: 100, activo: true, sortBy: "nombre", sortDir: "asc" },
  });
  return data?.data ?? data ?? [];
}

export async function getUser(id: string): Promise<UserDTO> {
  const { data } = await axiosInstance.get(`/users/${id}`);
  return data;
}

export async function createUser(dto: UpsertUserDto): Promise<UserDTO> {
  const { data } = await axiosInstance.post("/users", dto);
  return data;
}

export async function createReceptionAccessRequest(dto: Omit<UpsertUserDto, "rolId">): Promise<{ id: string; requestId: string }> {
  const { data } = await axiosInstance.post<{ data: { id: string; requestId: string } }>("/reception/request-access", dto);
  return data.data;
}

export async function updateUser(
  id: string,
  dto: Partial<UpsertUserDto>,
): Promise<UserDTO> {
  const { data } = await axiosInstance.patch(`/users/${id}`, dto);
  return data;
}

export async function getReceptionCitizen(id: string): Promise<UserDTO> {
  const { data } = await axiosInstance.get(`/reception/citizens/${id}`);
  return data;
}

export async function updateReceptionCitizen(id: string, dto: Partial<UpsertUserDto>): Promise<UserDTO> {
  const { data } = await axiosInstance.patch(`/reception/citizens/${id}`, dto);
  return data;
}
