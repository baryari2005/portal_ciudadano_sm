"use client";
import type { ReactNode } from "react";
import { Eye, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDetailHeader, AdminDetailPanel, AdminEmptyState, AdminListCard } from "@/components/shared/admin-patterns";
import { CatalogDetailField, CatalogFilterPopover, CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
export type UserDocumentRow = {
  id: string;
  requirementName: string;
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  originalName: string;
  uploadedAt: string;
  version: number;
  mimeType: string;
  size: number;
  rejectionReason: string | null;
  citizenObservations: string | null;
  expiresAt: string | null;
  validity: "SIN_VENCIMIENTO" | "VIGENTE" | "PROXIMO_A_VENCER" | "VENCIDO";
  user: { id: string; nombre: string | null; apellido: string | null; documento: string | null };
};

const labels = { PENDIENTE: "Pendiente", APROBADO: "Aprobado", RECHAZADO: "Rechazado" };
const validityLabels = { SIN_VENCIMIENTO: "Sin vencimiento", VIGENTE: "Vigente", PROXIMO_A_VENCER: "Próximo a vencer", VENCIDO: "Vencido" };

export function UserDocumentsBrowser({ filtered, selected, selectedId, setSelectedId, query, setQuery, statusFilter, setStatusFilter, validityFilter, setValidityFilter, embedded = false, onView, renderActions }: {
filtered: UserDocumentRow[]; selected: UserDocumentRow | null; selectedId: string; setSelectedId: (value: string) => void;
query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void;
validityFilter: string; setValidityFilter: (value: string) => void; embedded?: boolean;
onView: (document: UserDocumentRow) => void; renderActions?: (document: UserDocumentRow) => ReactNode;
}) { return (
      <div className={cn("grid gap-6 lg:grid-cols-[minmax(300px,.9fr)_minmax(380px,1.1fr)]", !embedded && "mt-6")}>
        <section className={cn("space-y-4", selectedId && "hidden lg:block")}>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <CatalogSearchInput
              value={query}
              onChange={setQuery}
              placeholder={embedded ? "Buscar por tipo de documento..." : "Buscar persona o documento..."}
            />
            <CatalogFilterPopover sections={[{ id: "review-status", title: "Revisión", value: statusFilter, options: [{ value: "all", label: "Todos" }, { value: "PENDIENTE", label: "Pendientes" }, { value: "APROBADO", label: "Aprobados" }, { value: "RECHAZADO", label: "Rechazados" }], onChange: setStatusFilter }, { id: "validity", title: "Vigencia", value: validityFilter, options: [{ value: "all", label: "Todas" }, { value: "VIGENTE", label: "Vigentes" }, { value: "PROXIMO_A_VENCER", label: "Próximos a vencer" }, { value: "VENCIDO", label: "Vencidos" }, { value: "SIN_VENCIMIENTO", label: "Sin vencimiento" }], onChange: setValidityFilter }]} />
          </div>
          {filtered.length ? <div className="grid gap-3">
            {filtered.map((item) => (
              <AdminListCard key={item.id} onClick={() => setSelectedId(item.id)} selected={selected?.id === item.id} leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white"><FileText className="size-6" /></span>} title={`${item.user.nombre ?? ""} ${item.user.apellido ?? ""}`.trim() || "Ciudadano sin nombre"} badges={<Badge variant="outline" className="border-[var(--brand-secondary)]/40 bg-[var(--brand-highlight)] text-[var(--brand-primary)]">{labels[item.status]}</Badge>} description={item.requirementName} meta={`DNI ${item.user.documento || "Sin registrar"}${item.status === "APROBADO" ? ` · ${validityLabels[item.validity]}` : ""}`} />
            ))}
          </div> : <AdminEmptyState title="No hay documentos presentados." description="Los documentos que adjunten los ciudadanos aparecerán aquí para su revisión." filtered={Boolean(query.trim()) || statusFilter !== "all" || validityFilter !== "all"} />}
        </section>

        <AdminDetailPanel onBack={() => setSelectedId("")} empty="Seleccioná un documento.">
          {selected ? <>
            <AdminDetailHeader title={selected.requirementName} leading={<div className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm"><FileText className="size-8" /></div>} badge={<Badge variant="outline" className="border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)]">{labels[selected.status]}</Badge>} action={<Button variant="outline" className="w-full border-[var(--brand-secondary)] bg-white font-bold text-[var(--brand-primary)]" onClick={() => onView(selected)}><Eye />Ver documento</Button>} />
            <dl className="mt-6 grid gap-3">
              <CatalogDetailField icon={FileText} label="Ciudadano">{selected.user.nombre} {selected.user.apellido} · DNI {selected.user.documento || "Sin registrar"}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Archivo">{selected.originalName}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Versión">Versión {selected.version}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Fecha de presentación">{new Date(selected.uploadedAt).toLocaleString("es-AR")}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Vigencia">{selected.status === "APROBADO" ? validityLabels[selected.validity] : "Se define al aprobar"}{selected.expiresAt ? ` · vence el ${new Date(selected.expiresAt).toLocaleDateString("es-AR", { timeZone: "UTC" })}` : ""}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Observaciones">{selected.citizenObservations || "Sin observaciones"}</CatalogDetailField>
              {selected.rejectionReason ? <CatalogDetailField icon={XCircle} label="Motivo del rechazo">{selected.rejectionReason}</CatalogDetailField> : null}
            </dl>
            {renderActions?.(selected)}
          </> : null}
        </AdminDetailPanel>
      </div>
);
}
