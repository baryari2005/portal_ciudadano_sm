import { axiosInstance } from "@/lib/axios";

import type {
  CategoriaActividad,
  CategoriaActividadListResponse,
  CreateCategoriaActividadInput,
  UpdateCategoriaActividadInput,
} from "../types/categoria-actividad.types";

type ItemResponse = { data: CategoriaActividad };

export type CategoriaActividadQuery = {
  activo?: boolean;
  nombre?: string;
  search?: string;
  orderBy?: "orden" | "nombre" | "createdAt";
  orderDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function listCategoriasActividadesClient(
  params?: CategoriaActividadQuery,
) {
  const { data } = await axiosInstance.get<CategoriaActividadListResponse>(
    "/categorias-actividades",
    { params },
  );
  return data;
}

export async function getCategoriaActividadClient(id: string) {
  const { data } = await axiosInstance.get<ItemResponse>(
    `/categorias-actividades/${id}`,
  );
  return data.data;
}

export async function createCategoriaActividadClient(
  payload: CreateCategoriaActividadInput,
) {
  const { data } = await axiosInstance.post<ItemResponse>(
    "/categorias-actividades",
    payload,
  );
  return data.data;
}

export async function updateCategoriaActividadClient(
  id: string,
  payload: UpdateCategoriaActividadInput,
) {
  const { data } = await axiosInstance.patch<ItemResponse>(
    `/categorias-actividades/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteCategoriaActividadClient(id: string) {
  const { data } = await axiosInstance.delete<ItemResponse>(
    `/categorias-actividades/${id}`,
  );
  return data.data;
}

export async function reactivateCategoriaActividadClient(id: string) {
  return updateCategoriaActividadClient(id, { activo: true });
}
