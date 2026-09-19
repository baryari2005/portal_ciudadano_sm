"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, ChevronRight, ClipboardCheck, FileCheck2, MapPin, Pencil, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { CatalogDetailField, CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogSearchInput, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { DocumentationStatusBadge } from "@/features/enrollment-documents/components/DocumentationStatusBadge";
import { DOCUMENTATION_STATUS } from "@/features/enrollment-documents/helpers/documentation-status";
import { cn } from "@/lib/utils";
import { citizenDelete } from "../services/citizen.service";
import { useCitizenData } from "./CitizenPrimitives";
import type { CitizenEnrollment } from "../types/citizen-enrollment.types";
import { EnrollmentBadge, formatCitizenEnrollmentScheduleSummary } from "./CitizenEnrollmentPrimitives";

export function CitizenEnrollmentsPage() {
  const { data, loading, error, retry } = useCitizenData<CitizenEnrollment[]>("/enrollments");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const items = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return items.filter((item) =>
      (status === "all" || item.status === status) &&
      (!value || `${item.schedule.activity.nombre} ${item.schedule.establishment.nombre} ${item.schedule.day}`.toLowerCase().includes(value)),
    );
  }, [items, query, status]);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (loading) return <CatalogLoadingState label="inscripciones" fullPage />;
  const filters = [{
    id: "enrollment-status",
    title: "Estado",
    value: status,
    options: [
      { value: "all", label: "Todas" },
      { value: "CONFIRMADA", label: "Confirmadas" },
      { value: "PENDIENTE", label: "Pendientes" },
      { value: "LISTA_ESPERA", label: "Lista de espera" },
      { value: "CANCELADA", label: "Canceladas" },
      { value: "RECHAZADA", label: "Rechazadas" },
      { value: "BAJA", label: "Bajas" },
    ],
    onChange: setStatus,
  }];

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <CatalogPageHeader title="Mis inscripciones" description="Consultá tus actividades, horarios, documentación y posiciones en lista de espera." total={items.length} />

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          No pudimos cargar tus inscripciones. <Button variant="ghost" onClick={retry}>Reintentar</Button>
        </div>
      ) : (
        <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
          <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por actividad, sede o día..." />
              <CatalogFilterPopover sections={filters} />
            </div>

            <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-290px)]">
              {filtered.map((item) => (
                <button key={item.id} type="button" data-admin-list-card="" onClick={() => setSelectedId(item.id)} className={cn("grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]", selectedId === item.id ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] shadow-sm" : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)] hover:shadow-sm")}>
                  <EnrollmentIcon item={item} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><span className="truncate font-extrabold text-[var(--brand-ink)]">{item.schedule.activity.nombre}</span><EnrollmentBadge status={item.status} /></span>
                    <span className="mt-1 block text-sm font-semibold text-[var(--brand-text)]">{formatCitizenEnrollmentScheduleSummary(item)}</span>
                    <span className="mt-1 block truncate text-xs text-[var(--brand-muted)]">{item.schedule.establishment.nombre}</span>
                  </span>
                  <ChevronRight className="size-5 text-[var(--brand-secondary)]" />
                </button>
              ))}
              {!filtered.length ? <CatalogEmptyState title="No hay inscripciones registradas." description="Tus inscripciones aparecerán en este listado." filtered={Boolean(query.trim()) || status !== "all"} /> : null}
            </div>
          </div>
          <div className={cn(!selectedId && "hidden lg:block")}><EnrollmentDetail item={selected} onBack={() => setSelectedId("")} onCancelled={retry} /></div>
        </section>
      )}
    </main>
  );
}

function EnrollmentDetail({ item, onBack, onCancelled }: { item: CitizenEnrollment | null; onBack: () => void; onCancelled: () => void | Promise<unknown> }) {
  const router = useRouter();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!item) return <aside className="hidden min-h-72 items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-8 text-center text-sm font-semibold text-[var(--brand-text)]/70 lg:flex">Seleccioná una inscripción para consultar su detalle.</aside>;

  const documentation = item.documentation ? DOCUMENTATION_STATUS[item.documentation.status] : null;
  const documentationHref = item.documentation?.status === "PENDIENTE" ? "/citizen/documents" : `/citizen/enrollments/${item.id}/documents`;
  const cancellable = ["CONFIRMADA", "LISTA_ESPERA", "PENDIENTE"].includes(item.status);
  const changeable = cancellable && item.schedule.activity.modalidadOperacion === "TURNO_RECURRENTE";

  async function cancel() {
    setCancelling(true);
    try {
      await citizenDelete(`/enrollments/${item!.id}`, { reason: "Cancelada por el ciudadano" });
      toast.success("Inscripción cancelada.");
      setCancelOpen(false);
      await onCancelled();
      onBack();
    } catch {
      toast.error("No pudimos cancelar la inscripción.");
      setCancelling(false);
    }
  }

  return (
    <aside className="h-fit rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 text-[var(--brand-ink)] shadow-sm sm:p-7 lg:sticky lg:top-0">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[var(--brand-primary)] lg:hidden"><ArrowLeft />Volver al listado</Button>
      <div className="flex items-start gap-4">
        <EnrollmentIcon item={item} large />
        <div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-extrabold text-[var(--brand-primary)]">{item.schedule.activity.nombre}</h2><div className="mt-2"><EnrollmentBadge status={item.status} /></div></div>
      </div>
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={CalendarClock} label="Días y horarios">{formatCitizenEnrollmentScheduleSummary(item)}</CatalogDetailField>
        <CatalogDetailField icon={MapPin} label="Establecimiento">{item.schedule.establishment.nombre}</CatalogDetailField>
        <CatalogDetailField icon={ClipboardCheck} label="Fecha de inscripción">{formatCatalogDate(item.enrollmentDate)}</CatalogDetailField>
        {item.nextSession ? <CatalogDetailField icon={CalendarClock} label="Próxima clase">{item.nextSession.date}</CatalogDetailField> : null}
        {item.waitlistPosition ? <CatalogDetailField icon={UsersRound} label="Lista de espera">Posición {item.waitlistPosition}</CatalogDetailField> : null}
      </dl>

      {item.documentation ? (
        <section className="mt-5 rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><FileCheck2 className="size-5" />Documentación</h3>
            <DocumentationStatusBadge summary={item.documentation} />
          </div>
          <p className="mt-3 text-sm text-[var(--brand-muted)]">{documentation?.description}</p>
          {documentation?.action ? <Button asChild variant="outline" className="mt-4 h-10 rounded-xl border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)]"><Link href={documentationHref}>{documentation.action}</Link></Button> : null}
        </section>
      ) : null}

      {changeable || cancellable ? (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-[var(--brand-border-soft)] pt-5">
          {changeable ? <Button type="button" variant="outline" onClick={() => router.push(`/citizen/enrollments/${item.id}/schedule`)} className="h-10 rounded-xl border-[var(--brand-primary)] text-xs font-bold text-[var(--brand-primary)]"><Pencil />Cambiar horarios</Button> : null}
          {cancellable ? <Button type="button" variant="outline" onClick={() => setCancelOpen(true)} className="h-10 rounded-xl border-red-300 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 hover:text-red-800"><Trash2 />Cancelar inscripción</Button> : null}
        </div>
      ) : null}

      <ConfirmDialog open={cancelOpen} title="¿Querés cancelar esta inscripción?" description="Tu lugar podrá asignarse a otra persona." confirmLabel={cancelling ? "Cancelando..." : "Cancelar inscripción"} icon={<Trash2 />} onConfirm={cancel} onClose={() => !cancelling && setCancelOpen(false)} />
    </aside>
  );
}

function EnrollmentIcon({ item, large = false }: { item: CitizenEnrollment; large?: boolean }) {
  const size = large ? "size-16 rounded-2xl" : "size-12";
  if (item.schedule.activity.imageUrl) return <ActivityImagePreview source={item.schedule.activity.imageUrl} alt={`Imagen de ${item.schedule.activity.nombre}`} className={cn("shrink-0 !rounded-full !border-0", size)} />;
  return <span className={cn("grid shrink-0 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm", size)}><ClipboardCheck className={large ? "size-8" : "size-6"} /></span>;
}
