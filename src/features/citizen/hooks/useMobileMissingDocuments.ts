"use client";

import { useSyncExternalStore } from "react";
import useSWR from "swr";
import { getMissingDocumentRequirements } from "@/features/user-documents/helpers/document-display-status";
import { citizenGet } from "../services/citizen.service";

type ActivityDocumentRequirement = { id: string; name: string; mandatory: boolean; requiresDocument: boolean; active: boolean };
type CitizenDocuments = { requirements: Array<{ id: string; current: { status: string; validity: string } | null }> };
const mobileQuery = "(max-width: 1023px)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const getSnapshot = () => window.matchMedia(mobileQuery).matches;
const getServerSnapshot = () => false;
const fetchDocuments = () => citizenGet<CitizenDocuments>("/documents");

export function useMobileMissingDocuments(requirements: ActivityDocumentRequirement[] | undefined) {
  const mobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const required = requirements?.filter((item) => item.active && item.mandatory && item.requiresDocument) ?? [];
  const { data, isLoading } = useSWR(mobile && required.length ? "/citizen/documents" : null, fetchDocuments);
  // Match the existing "Mis documentos" presentation status, without treating
  // pending review or rejection as an absent upload. Unknown data is not missing.
  const missing = data ? getMissingDocumentRequirements(required, data.requirements) : [];
  return { missing, loading: isLoading };
}
