import { axiosInstance } from "@/lib/axios";

import type {
  CreatePublicoObjetivoInput,
  PublicoObjetivo,
  PublicoObjetivoListResponse,
  UpdatePublicoObjetivoInput,
} from "../types/publico-objetivo.types";

type ItemResponse = { data: PublicoObjetivo };

export type PublicoObjetivoQuery = {
  activo?: boolean;
  nombre?: string;
  search?: string;
  orderBy?: "orden" | "nombre" | "createdAt";
  orderDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export async function listPublicosObjetivoClient(
  params?: PublicoObjetivoQuery,
) {
  const { data } = await axiosInstance.get<PublicoObjetivoListResponse>(
    "/publicos-objetivo",
    { params },
  );
  return data;
}

export async function getPublicoObjetivoClient(id: string) {
  const { data } = await axiosInstance.get<ItemResponse>(
    `/publicos-objetivo/${id}`,
  );
  return data.data;
}

export async function createPublicoObjetivoClient(
  payload: CreatePublicoObjetivoInput,
) {
  const { data } = await axiosInstance.post<ItemResponse>(
    "/publicos-objetivo",
    payload,
  );
  return data.data;
}

export async function updatePublicoObjetivoClient(
  id: string,
  payload: UpdatePublicoObjetivoInput,
) {
  const { data } = await axiosInstance.patch<ItemResponse>(
    `/publicos-objetivo/${id}`,
    payload,
  );
  return data.data;
}

export async function deletePublicoObjetivoClient(id: string) {
  const { data } = await axiosInstance.delete<ItemResponse>(
    `/publicos-objetivo/${id}`,
  );
  return data.data;
}

export async function reactivatePublicoObjetivoClient(id: string) {
  return updatePublicoObjetivoClient(id, { activo: true });
}
