import type { PersonSearchOption } from "@/components/shared/PersonSearchSelector";
import type { listCitizenUserDocuments } from "@/features/user-documents/services/user-documents.server";
import type { EnrollmentDocument } from "@/features/enrollment-documents/types/enrollment-document.types";
import { axiosInstance } from "@/lib/axios";
import { workspaceEstablishmentStorageKey } from "@/features/auth/libs/workspaces";
import { useAuth } from "@/stores/auth";

type Serialized<T> = T extends Date ? string : T extends object ? { [K in keyof T]: Serialized<T[K]> } : T;
export type CitizenDocumentRequirement = Serialized<Awaited<ReturnType<typeof listCitizenUserDocuments>>>["requirements"][number];

export async function searchTeacherDocumentCitizens(query: string) {
  return (await axiosInstance.get<{ data: { items: PersonSearchOption[] } }>("/teacher/citizen-documents", { params: { q: query } })).data.data.items;
}

export async function getTeacherCitizenDocuments(citizenId: string) {
  return (await axiosInstance.get<{ data: { requirements: CitizenDocumentRequirement[] } }>("/teacher/citizen-documents", { params: { citizenId, ...teacherVenueParams() } })).data.data.requirements;
}

export async function getTeacherDocumentPreviewUrl(documentId: string) {
  return (await axiosInstance.get<{ data: { url: string } }>(`/teacher/citizen-documents/${encodeURIComponent(documentId)}/download`, { params: teacherVenueParams() })).data.data.url;
}

export async function getTeacherEnrollmentDocuments(enrollmentId: string) {
  return (await axiosInstance.get<{ data: EnrollmentDocument[] }>("/teacher/enrollment-documents", { params: { enrollmentId, ...teacherVenueParams() } })).data.data;
}

export async function getTeacherEnrollmentDocumentPreviewUrl(documentId: string) {
  return (await axiosInstance.get<{ data: { url: string } }>(`/teacher/enrollment-documents/${encodeURIComponent(documentId)}/download`, { params: teacherVenueParams() })).data.data.url;
}

function teacherVenueParams() {
  const userId = useAuth.getState().user?.id;
  return { establishmentId: userId && typeof window !== "undefined" ? sessionStorage.getItem(workspaceEstablishmentStorageKey(userId, "teacher")) ?? undefined : undefined };
}
