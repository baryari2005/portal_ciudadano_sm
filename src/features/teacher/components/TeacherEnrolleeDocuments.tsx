"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserDocumentsBrowser } from "@/features/user-documents/components/UserDocumentsBrowser";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { Button } from "@/components/ui/button";
import { useTeacherCitizenDocuments } from "../hooks/useTeacherCitizenDocuments";


export function TeacherEnrolleeDocuments({ citizenId }: { citizenId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [validityFilter, setValidityFilter] = useState("all");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, isLoading, mutate } = useTeacherCitizenDocuments(citizenId);
  const documents = (data ?? []).flatMap((requirement) => requirement.current ? [requirement.current] : []);
  const filtered = documents.filter((document) =>
    document.requirementName.toLowerCase().includes(query.toLowerCase()) &&
    (statusFilter === "all" || document.status === statusFilter) &&
    (validityFilter === "all" || document.validity === validityFilter)
  );
  const selected = filtered.find((document) => document.id === selectedId) ?? filtered[0] ?? null;
  if (isLoading) return <CatalogLoadingState label="documentos" fullPage />;
  if (error) return <div className="rounded-xl border border-dashed border-[var(--brand-border)] bg-white p-4 text-center text-sm text-[var(--brand-muted)]"><p>No pudimos cargar la documentación.</p><Button type="button" variant="ghost" className="mt-1" onClick={() => void mutate()}>Reintentar</Button></div>;
  return <>
    <UserDocumentsBrowser embedded filtered={filtered} selected={selected} selectedId={selectedId} setSelectedId={setSelectedId} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} validityFilter={validityFilter} setValidityFilter={setValidityFilter} onView={(document) => router.push(`/teacher/enrollees/${encodeURIComponent(citizenId)}/documents/${encodeURIComponent(document.id)}?${searchParams.toString()}`)} />
  </>;
}
