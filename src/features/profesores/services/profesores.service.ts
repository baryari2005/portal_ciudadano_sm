import { axiosInstance } from "@/lib/axios";
import type {
  CreateProfesorInput,
  Profesor,
  ProfesorFilters,
  ProfesorListResponse,
  ProfesorEstado,
  UpdateProfesorInput,
  UsuarioDisponible,
} from "../types/profesor.types";

type ItemResponse = { data: Profesor };
export const listarProfesoresClient = async (
  params?: Partial<ProfesorFilters>,
) =>
  (await axiosInstance.get<ProfesorListResponse>("/profesores", { params }))
    .data;
export const obtenerProfesorClient = async (id: string) =>
  (await axiosInstance.get<ItemResponse>(`/profesores/${id}`)).data.data;
export const crearProfesorClient = async (payload: CreateProfesorInput) =>
  (await axiosInstance.post<ItemResponse>("/profesores", payload)).data.data;
export const editarProfesorClient = async (
  id: string,
  payload: UpdateProfesorInput,
) =>
  (await axiosInstance.patch<ItemResponse>(`/profesores/${id}`, payload)).data
    .data;
export const cambiarEstadoProfesorClient = async (
  id: string,
  estado: ProfesorEstado,
) =>
  (await axiosInstance.patch<ItemResponse>(`/profesores/${id}`, { estado }))
    .data.data;
export const desactivarProfesorClient = async (id: string) =>
  (await axiosInstance.delete<ItemResponse>(`/profesores/${id}`)).data.data;
export async function buscarUsuariosDisponiblesClient(search: string, role?: "teacher" | "admin") {
  return (
    await axiosInstance.get<{ data: UsuarioDisponible[] }>(
      "/profesores/usuarios-disponibles",
      { params: { search, role, pageSize: 20 } },
    )
  ).data.data;
}
