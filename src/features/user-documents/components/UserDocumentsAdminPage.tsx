"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel, AdminEmptyState, AdminListCard } from "@/components/shared/admin-patterns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CatalogDetailField, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";
import {
  ProfileDialogBody,
  ProfileDialogFooter,
  ProfileDialogHeader,
  ProfileFormField,
  profilePrimaryButtonClassName,
  profileSecondaryButtonClassName,
} from "@/components/layout/user-menu/ProfileDialogParts";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/useCan";

type Row = {
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

export function UserDocumentsAdminPage({ userId: userIdProp, embedded = false, onLoadingChange }: { userId?: string; embedded?: boolean; onLoadingChange?: (loading: boolean) => void } = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = userIdProp ?? searchParams.get("userId");
  const [items, setItems] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [validityFilter, setValidityFilter] = useState("all");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState<"APROBADO" | "RECHAZADO" | null>(null);
  const [loading, setLoading] = useState(true);
  const canUpload = useCan("enrollment_documents", "crear");

  async function load() {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/user-documents");
      const rows = response.data.data as Row[];
      setItems(rows);
      setSelectedId((current) => current && rows.some((item) => item.id === current) ? current : rows[0]?.id ?? "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => onLoadingChange?.(loading), [loading, onLoadingChange]);

  const filtered = useMemo(() => items.filter((item) =>
    (!query || (embedded ? item.requirementName : `${item.user.nombre} ${item.user.apellido} ${item.user.documento} ${item.requirementName} ${item.originalName}`).toLowerCase().includes(query.toLowerCase())) &&
    (statusFilter === "all" || item.status === statusFilter) &&
    (validityFilter === "all" || item.validity === validityFilter) &&
    (!userId || item.user.id === userId)
  ), [items, query, statusFilter, validityFilter, userId, embedded]);
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  function view(document: Row) { router.push(`/user-documents/${document.id}/review`); }

  async function review(status: "APROBADO" | "RECHAZADO") {
    if (!selected) return;
    const disapproving = selected.status === "APROBADO" && status === "RECHAZADO";
    if (status === "RECHAZADO" && !reason.trim()) {
      toast.error("Indicá el motivo del rechazo.");
      return;
    }
    setSaving(true);
    setSavingStatus(status);
    try {
      await axiosInstance.post(`/user-documents/${selected.id}/review`, { status, reason: status === "RECHAZADO" ? reason : undefined });
      await load();
      setRejectOpen(false);
      setReason("");
      toast.success(status === "APROBADO" ? "Documento aprobado y usuario notificado." : disapproving ? "Documento desaprobado y usuario notificado." : "Documento rechazado y usuario notificado.");
    } catch {
      toast.error("No pudimos revisar el documento.");
    } finally {
      setSaving(false);
      setSavingStatus(null);
    }
  }

  if (loading && !embedded) return <CatalogLoadingState label="documentos de ciudadanos" fullPage />;

  return (
    <main className={embedded ? "min-h-0" : "min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8"}>
      {!embedded ? <CatalogPageHeader icon={FileText} title="Documentos de ciudadanos" description="Visualizá y revisá el legajo documental presentado por los ciudadanos." total={filtered.length} actions={canUpload?<Button asChild className="h-11 rounded-xl bg-[var(--brand-primary)] px-5 font-bold text-white"><Link href="/user-documents/new"><UploadCloud/>Cargar documento</Link></Button>:undefined} /> : null}
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
            <AdminDetailHeader title={selected.requirementName} leading={<div className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm"><FileText className="size-8" /></div>} badge={<Badge variant="outline" className="border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)]">{labels[selected.status]}</Badge>} action={<Button variant="outline" className="w-full border-[var(--brand-secondary)] bg-white font-bold text-[var(--brand-primary)]" onClick={() => view(selected)}><Eye />Ver documento</Button>} />
            <dl className="mt-6 grid gap-3">
              <CatalogDetailField icon={FileText} label="Ciudadano">{selected.user.nombre} {selected.user.apellido} · DNI {selected.user.documento || "Sin registrar"}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Archivo">{selected.originalName}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Versión">Versión {selected.version}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Fecha de presentación">{new Date(selected.uploadedAt).toLocaleString("es-AR")}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Vigencia">{selected.status === "APROBADO" ? validityLabels[selected.validity] : "Se define al aprobar"}{selected.expiresAt ? ` · vence el ${new Date(selected.expiresAt).toLocaleDateString("es-AR", { timeZone: "UTC" })}` : ""}</CatalogDetailField>
              <CatalogDetailField icon={FileText} label="Observaciones">{selected.citizenObservations || "Sin observaciones"}</CatalogDetailField>
              {selected.rejectionReason ? <CatalogDetailField icon={XCircle} label="Motivo del rechazo">{selected.rejectionReason}</CatalogDetailField> : null}
            </dl>
            {selected.status === "PENDIENTE" || selected.status === "APROBADO" ? <AdminDetailActions>
              {selected.status === "PENDIENTE" ? <><Button className="bg-[var(--brand-primary)]" disabled={saving} onClick={() => void review("APROBADO")}>{savingStatus === "APROBADO" ? <><Loader2 className="animate-spin" />Aprobando...</> : <><CheckCircle2 />Aprobar</>}</Button><Button variant="outline" disabled={saving} onClick={() => setRejectOpen(true)}><XCircle />Rechazar</Button></> : null}
              {selected.status === "APROBADO" ? <Button variant="outline" className="text-red-700 hover:bg-red-50" disabled={saving} onClick={() => setRejectOpen(true)}><XCircle />Desaprobar</Button> : null}
            </AdminDetailActions> : null}
          </> : null}
        </AdminDetailPanel>
      </div>

      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!saving) setRejectOpen(open); }}>
        <DialogContent className="overflow-hidden rounded-2xl border-[#DDE5D8] bg-white p-0 shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-md">
          <ProfileDialogHeader
            icon={XCircle}
            title={selected?.status === "APROBADO" ? "Desaprobar documento" : "Rechazar documento"}
            description={selected?.status === "APROBADO" ? "Indicá por qué se revoca la aprobación. El ciudadano será notificado y podrá presentar una nueva versión." : "Indicá qué debe corregir el ciudadano antes de presentar una nueva versión."}
          />
          <ProfileDialogBody>
            <ProfileFormField label="Motivo del rechazo *">
              <Textarea
                id="rejection-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                rows={5}
                placeholder="Explicá claramente qué debe corregir..."
                className="min-h-32 resize-none rounded-lg border-[#D7DED6] bg-white text-[var(--brand-primary)] shadow-sm placeholder:text-[#7C877F] focus-visible:border-[var(--brand-primary)] focus-visible:ring-[var(--brand-secondary)]/25"
              />
              <p className="text-right text-xs font-medium text-[#7C877F]">{reason.length}/500</p>
            </ProfileFormField>
          </ProfileDialogBody>
          <ProfileDialogFooter>
            <Button variant="outline" className={profileSecondaryButtonClassName} disabled={saving} onClick={() => setRejectOpen(false)}>Cancelar</Button>
            <Button className={profilePrimaryButtonClassName} disabled={saving || !reason.trim()} onClick={() => void review("RECHAZADO")}>
              {saving ? <><Loader2 className="animate-spin" />Procesando...</> : <><XCircle />{selected?.status === "APROBADO" ? "Desaprobar y notificar" : "Rechazar y notificar"}</>}
            </Button>
          </ProfileDialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
