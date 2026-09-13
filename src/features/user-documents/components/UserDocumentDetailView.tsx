"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, XCircle } from "lucide-react";
import { AdminDetailHeader, AdminDetailPanel } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CatalogDetailField } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { UserDocumentPreview } from "./UserDocumentPreview";
export type DocumentRow = {
  id: string;
  requirementName: string;
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  originalName: string;
  uploadedAt: string;
  version: number;
  mimeType: string;
  rejectionReason: string | null;
  citizenObservations: string | null;
  expiresAt: string | null;
  validity: "SIN_VENCIMIENTO" | "VIGENTE" | "PROXIMO_A_VENCER" | "VENCIDO";
  user: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    documento: string | null;
  };
};
const labels = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
};
const validityLabels = {
  SIN_VENCIMIENTO: "Sin vencimiento",
  VIGENTE: "Vigente",
  PROXIMO_A_VENCER: "Próximo a vencer",
  VENCIDO: "Vencido",
};

export function UserDocumentDetailView({ document, url, loading = false, backHref, renderActions, children }: {
 document: DocumentRow | null; url: string; loading?: boolean; backHref: string;
 renderActions?: (document: DocumentRow) => ReactNode; children?: ReactNode;
}) { return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 border-b border-[var(--brand-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--brand-panel)] text-[var(--brand-primary)]">
            <FileText className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-[var(--brand-primary)] sm:text-4xl">
              Revisión del documento
            </h1>
            <p className="mt-2 text-[var(--brand-text)]/80">
              Visualizá el archivo y revisá su información antes de tomar una
              decisión.
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="h-12 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)] px-8 font-bold"
        >
          <Link href={backHref}>
            <ArrowLeft />
            Volver
          </Link>
        </Button>
      </header>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(380px,.7fr)]">
        <section className="relative min-h-[70dvh] overflow-hidden rounded-3xl border border-[var(--brand-border-soft)] bg-[#EEF1EC] p-3 sm:p-5">
          {loading ? (
            <Loading />
          ) : document && url ? (
            <UserDocumentPreview url={url} mimeType={document.mimeType} originalName={document.originalName} />
          ) : (
            <p>No pudimos mostrar el archivo.</p>
          )}
        </section>
        {loading ? (
          <AdminDetailPanel loading loadingLabel="datos del documento" />
        ) : document ? (
          <AdminDetailPanel>
            <AdminDetailHeader
              title={document.requirementName}
              leading={
                <span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white">
                  <FileText className="size-8" />
                </span>
              }
              badge={
                <Badge variant="outline" className="border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)]">
                  <span className="size-1.5 rounded-full bg-[var(--brand-primary)]" />
                  {labels[document.status]}
                </Badge>
              }
            />
            <dl className="mt-6 grid gap-3">
              <CatalogDetailField icon={FileText} label="Ciudadano">
                {document.user.nombre} {document.user.apellido} · DNI{" "}
                {document.user.documento || "Sin registrar"}
              </CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Archivo">
                {document.originalName}
              </CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Versión">
                Versión {document.version}
              </CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Presentación">
                {new Date(document.uploadedAt).toLocaleString("es-AR")}
              </CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Vigencia">
                {document.status === "APROBADO"
                  ? validityLabels[document.validity]
                  : "Se define al aprobar"}
              </CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Observaciones">
                {document.citizenObservations || "Sin observaciones"}
              </CatalogDetailField>
              {document.rejectionReason ? (
                <CatalogDetailField icon={XCircle} label="Motivo del rechazo">
                  {document.rejectionReason}
                </CatalogDetailField>
              ) : null}
            </dl>
            {renderActions?.(document)}
          </AdminDetailPanel>
        ) : (
          <AdminDetailPanel empty="No pudimos cargar los datos del documento." />
        )}
      </div>
      {children}
    </main>
  );
}
function Loading() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <span className="flex items-center gap-3 font-bold text-[var(--brand-primary)]">
        <Loader2 className="animate-spin" />
        Cargando documento...
      </span>
    </div>
  );
}
