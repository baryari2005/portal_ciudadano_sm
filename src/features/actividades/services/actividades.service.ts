import { axiosInstance } from "@/lib/axios";

import type {
  Actividad,
  ActividadFilters,
  ActividadPayload,
  UpdateActividadPayload,
} from "../types/actividad.types";

type ListResponse = { data: Actividad[] };
type ItemResponse = { data: Actividad };

export async function listActividadesClient(filters?: ActividadFilters) {
  const { data } = await axiosInstance.get<ListResponse>("/actividades", {
    params: filters,
  });
  return data.data;
}

export async function createActividadClient(payload: ActividadPayload) {
  const { data } = await axiosInstance.post<ItemResponse>(
    "/actividades",
    payload,
  );
  return data.data;
}

export async function getActividadClient(id: string) {
  const { data } = await axiosInstance.get<ItemResponse>(`/actividades/${id}`);
  return data.data;
}

export async function updateActividadClient(
  id: string,
  payload: ActividadPayload,
) {
  const { data } = await axiosInstance.put<ItemResponse>(
    `/actividades/${id}`,
    payload,
  );
  return data.data;
}

export async function patchActividadClient(
  id: string,
  payload: UpdateActividadPayload,
) {
  const { data } = await axiosInstance.patch<ItemResponse>(
    `/actividades/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteActividadClient(id: string, reason: string) {
  await axiosInstance.delete(`/actividades/${id}`, { data: { reason } });
}

export type ActivityDeletionPreview = {
  id: string;
  name: string;
  state: string;
  schedules: number;
  sessions: number;
  futureSessions: number;
  enrollments: number;
  affectedUsers: number;
  reservations: number;
  attendanceRecords: number;
  enrollmentDocuments: number;
  accessRecords: number;
  canPurge: boolean;
  purgeBlockedReason: string | null;
};

export async function getActivityDeletionPreviewClient(id: string) {
  const { data } = await axiosInstance.get<{ data: ActivityDeletionPreview }>(`/actividades/${id}/lifecycle`);
  return data.data;
}

export async function archiveActivityClient(id: string, reason: string) {
  const { data } = await axiosInstance.post(`/actividades/${id}/lifecycle`, { reason });
  return data.data;
}

export async function purgeActivityClient(id: string, confirmation: string) {
  await axiosInstance.delete(`/actividades/${id}/lifecycle`, { data: { confirmation } });
}
