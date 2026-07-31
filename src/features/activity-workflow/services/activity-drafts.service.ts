import { axiosInstance } from "@/lib/axios";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import type { ActivityDraft, ActivityDraftPayload } from "../types/activity-draft.types";
export async function createDraftClient(activityId?: string) { const { data } = await axiosInstance.post<{ data: ActivityDraft }>("/activity-drafts", activityId ? { activityId } : {}); return data.data; }
export async function listDraftsClient() { const { data } = await axiosInstance.get<{ data: ActivityDraft[] }>("/activity-drafts"); return data.data; }
export async function getDraftClient(id: string) { const { data } = await axiosInstance.get<{ data: ActivityDraft }>(`/activity-drafts/${id}`); return data.data; }
export async function saveDraftClient(id: string, payload: ActivityDraftPayload, currentStep: number) { const { data } = await axiosInstance.patch<{ data: ActivityDraft }>(`/activity-drafts/${id}`, { payload, pasoActual: currentStep }); return data.data; }
export async function publishDraftClient(id: string) { try { const { data } = await axiosInstance.post<{ data: { id: string } }>(`/activity-drafts/${id}/publish`); return data.data; } catch (error) { throw new Error(getAxiosMessage(error, "No pudimos publicar la actividad.")); } }
export async function checkDraftProfessorAvailabilityClient(id: string, professorId: string, schedules: ActivityDraftPayload["schedules"]) { const { data } = await axiosInstance.post<{ data: { available: boolean; message: string | null } }>(`/activity-drafts/${id}/professor-availability`, { professorId, schedules }); return data.data; }
export async function discardDraftClient(id:string){await axiosInstance.delete(`/activity-drafts/${id}`);}
