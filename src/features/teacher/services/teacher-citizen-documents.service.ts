import type { PersonSearchOption } from "@/components/shared/PersonSearchSelector";
import type { listCitizenUserDocuments } from "@/features/user-documents/services/user-documents.server";
import { axiosInstance } from "@/lib/axios";

type Serialized<T> = T extends Date ? string : T extends object ? { [K in keyof T]: Serialized<T[K]> } : T;
export type CitizenDocumentRequirement = Serialized<Awaited<ReturnType<typeof listCitizenUserDocuments>>>["requirements"][number];

export async function searchTeacherDocumentCitizens(query: string) {
  return (await axiosInstance.get<{ data: { items: PersonSearchOption[] } }>("/teacher/citizen-documents", { params: { q: query } })).data.data.items;
}

export async function getTeacherCitizenDocuments(citizenId: string) {
  return (await axiosInstance.get<{ data: { requirements: CitizenDocumentRequirement[] } }>("/teacher/citizen-documents", { params: { citizenId } })).data.data.requirements;
}

export async function getTeacherDocumentPreviewUrl(documentId: string) {
  return (await axiosInstance.get<{ data: { url: string } }>(`/user-documents/${encodeURIComponent(documentId)}/download`)).data.data.url;
}
