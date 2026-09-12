"use client";

import useSWR from "swr";
import { getTeacherCitizenDocuments, getTeacherDocumentPreviewUrl } from "../services/teacher-citizen-documents.service";

export function useTeacherCitizenDocuments(citizenId: string | null) {
  return useSWR(citizenId ? ["teacher-citizen-documents", citizenId] : null, ([, id]) => getTeacherCitizenDocuments(id));
}

export function useTeacherDocumentPreview(documentId: string | null) {
  return useSWR(documentId ? ["teacher-document-preview", documentId] : null, ([, id]) => getTeacherDocumentPreviewUrl(id), { revalidateOnFocus: false });
}
