"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { UserDocumentDetailView } from "@/features/user-documents/components/UserDocumentDetailView";
import { useTeacherCitizenDocuments, useTeacherDocumentPreview } from "../hooks/useTeacherCitizenDocuments";

export function TeacherCitizenDocumentPage({ citizenId, documentId }: { citizenId: string; documentId: string }) {
  const searchParams = useSearchParams();
  const enrollmentId = searchParams.get("enrollmentId");
  const backHref = `/teacher/enrollees/${encodeURIComponent(citizenId)}/record/documents${enrollmentId ? `?enrollmentId=${encodeURIComponent(enrollmentId)}` : ""}`;
  const documents = useTeacherCitizenDocuments(citizenId);
  const document = documents.data?.flatMap((requirement) => requirement.history).find((item) => item.id === documentId) ?? null;
  const preview = useTeacherDocumentPreview(document?.id ?? null);

  if (documents.isLoading || preview.isLoading) return <CatalogLoadingState label="documento" fullPage />;
  if (documents.error || preview.error || !document || !preview.data) return (
    <main className="min-h-full bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <p className="text-sm text-[var(--brand-muted)]">No pudimos cargar el documento.</p>
      <div className="mt-4 flex gap-3">
        <Button variant="outline" onClick={() => { void documents.mutate(); void preview.mutate(); }}>Reintentar</Button>
        <Button asChild variant="outline"><Link href={backHref}>Volver</Link></Button>
      </div>
    </main>
  );

  return <UserDocumentDetailView document={document} url={preview.data} backHref={backHref} />;
}
