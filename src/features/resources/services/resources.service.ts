import { axiosInstance } from "@/lib/axios";
import type { Resource, ResourceInput, UpdateResourceInput } from "../types/resource.types";

type ItemResponse = { data: Resource };
type ListResponse = { data: Resource[] };
export type ResourceOptions = { establishments: Array<{ id: string; nombre: string; direccion: string; activo: boolean; estado: string }> };

export async function listResourcesClient() { const { data } = await axiosInstance.get<ListResponse>("/resources"); return data.data; }
export async function getResourceClient(id: string) { const { data } = await axiosInstance.get<ItemResponse>(`/resources/${id}`); return data.data; }
export async function resourceOptionsClient() { const { data } = await axiosInstance.get<{ data: ResourceOptions }>("/resources/options"); return data.data; }
export async function createResourceClient(input: ResourceInput) { const { data } = await axiosInstance.post<ItemResponse>("/resources", input); return data.data; }
export async function updateResourceClient(id: string, input: UpdateResourceInput) { const { data } = await axiosInstance.patch<ItemResponse>(`/resources/${id}`, input); return data.data; }
export async function deleteResourceClient(id: string) { const { data } = await axiosInstance.delete<{ data: unknown }>(`/resources/${id}`); return data.data; }
