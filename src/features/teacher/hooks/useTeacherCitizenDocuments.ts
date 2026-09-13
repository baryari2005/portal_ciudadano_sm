"use client";

import useSWR from "swr";
import { getTeacherCitizenDocuments, getTeacherDocumentPreviewUrl, getTeacherEnrollmentDocuments, getTeacherEnrollmentDocumentPreviewUrl } from "../services/teacher-citizen-documents.service";

export function useTeacherCitizenDocuments(citizenId: string | null) {
  return useSWR(citizenId ? ["teacher-citizen-documents", citizenId] : null, ([, id]) => getTeacherCitizenDocuments(id));
}

export function useTeacherDocumentPreview(documentId: string | null) {
  return useSWR(documentId ? ["teacher-document-preview", documentId] : null, ([, id]) => getTeacherDocumentPreviewUrl(id), { revalidateOnFocus: false });
}

export function useTeacherEnrollmentDocuments(enrollmentId: string | null) {
  return useSWR(enrollmentId ? ["teacher-enrollment-documents", enrollmentId] : null, ([, id]) => getTeacherEnrollmentDocuments(id));
}

export function useTeacherEnrollmentDocumentPreview(documentId: string | null) {
  return useSWR(documentId ? ["teacher-enrollment-document-preview", documentId] : null, ([, id]) => getTeacherEnrollmentDocumentPreviewUrl(id), { revalidateOnFocus: false });
}
