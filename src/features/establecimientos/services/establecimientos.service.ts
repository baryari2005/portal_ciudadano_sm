import { axiosInstance } from "@/lib/axios";

import type {
  Establecimiento,
  EstablecimientoPayload,
} from "../types/establecimiento.types";

type ListResponse = { data: Establecimiento[] };
type ItemResponse = { data: Establecimiento };

export async function listEstablecimientosClient() {
  const { data } = await axiosInstance.get<ListResponse>("/establecimientos");
  return data.data;
}

export async function getEstablecimientoClient(id: string) {
  const { data } = await axiosInstance.get<ItemResponse>(
    `/establecimientos/${id}`,
  );
  return data.data;
}

export async function createEstablecimientoClient(
  payload: EstablecimientoPayload,
) {
  const { data } = await axiosInstance.post<ItemResponse>(
    "/establecimientos",
    payload,
  );
  return data.data;
}

export async function updateEstablecimientoClient(
  id: string,
  payload: EstablecimientoPayload,
) {
  const { data } = await axiosInstance.put<ItemResponse>(
    `/establecimientos/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteEstablecimientoClient(id: string) {
  await axiosInstance.delete(`/establecimientos/${id}`);
}
