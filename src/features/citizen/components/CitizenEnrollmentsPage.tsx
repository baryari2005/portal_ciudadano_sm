"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, ChevronRight, ClipboardCheck, FileCheck2, MapPin, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CatalogDetailField, CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogSearchInput, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { DocumentationStatusBadge } from "@/features/enrollment-documents/components/DocumentationStatusBadge";
import { DOCUMENTATION_STATUS } from "@/features/enrollment-documents/helpers/documentation-status";
import type { EnrollmentDocumentationSummary } from "@/features/enrollment-documents/types/enrollment-document.types";
import { cn } from "@/lib/utils";
import { citizenDelete } from "../services/citizen.service";
import { useCitizenData } from "./CitizenPrimitives";

const enrollmentLabel: Record<string, string> = { CONFIRMADA: "Confirmada", LISTA_ESPERA: "Lista de espera", PENDIENTE: "Pendiente", CANCELADA: "Cancelada", RECHAZADA: "Rechazada", BAJA: "Baja" };
type CitizenEnrollment = { id: string; status: string; enrollmentDate: string; waitlistPosition: number | null; schedule: { day: string; startTime: string; endTime: string; activity: { id: string; nombre: string }; establishment: { id: string; nombre: string } }; nextSession: { id: string; date: string } | null; documentation: EnrollmentDocumentationSummary };

export function CitizenEnrollmentsPage() {
  const { data, loading, error, retry } = useCitizenData<CitizenEnrollment[]>("/enrollments");
  const [selectedId, setSelectedId] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const items = data ?? [];
  const filtered = useMemo(() => { const value = query.trim().toLowerCase(); return items.filter((item) => (status === "all" || item.status === status) && (!value || `${item.schedule.activity.nombre} ${item.schedule.establishment.nombre} ${item.schedule.day}`.toLowerCase().includes(value))); }, [items, query, status]);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (loading) return <CatalogLoadingState label="inscripciones" fullPage />;

  async function cancel() {
    if (!cancelId) return;
    try { await citizenDelete(`/enrollments/${cancelId}`, { reason: "Cancelada por el ciudadano" }); toast.success("Inscripción cancelada."); setCancelId(null); setSelectedId(""); await retry(); }
    catch { toast.error("No pudimos cancelar la inscripción."); }
  }

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
    <CatalogPageHeader title="Mis inscripciones" description="Consultá tus actividades, horarios, documentación y posiciones en lista de espera." total={items.length} />
    {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">No pudimos cargar tus inscripciones. <Button variant="ghost" onClick={retry}>Reintentar</Button></div> : null}
    {!error ? <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
      <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por actividad, sede o día..." />
          <CatalogFilterPopover sections={[{ id: "enrollment-status", title: "Estado", value: status, options: [{ value: "all", label: "Todas" }, { value: "CONFIRMADA", label: "Confirmadas" }, { value: "PENDIENTE", label: "Pendientes" }, { value: "LISTA_ESPERA", label: "Lista de espera" }, { value: "CANCELADA", label: "Canceladas" }, { value: "RECHAZADA", label: "Rechazadas" }, { value: "BAJA", label: "Bajas" }], onChange: setStatus }]} />
        </div>
        <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-290px)]">
          {filtered.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={cn("grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#819B56]", selectedId === item.id ? "border-[#1D4F36] bg-[#EEF6E9] shadow-sm" : "border-[#DDE8D7] bg-white hover:border-[#819B56] hover:shadow-sm")}>
            <span className="grid size-12 place-items-center rounded-xl bg-[#1D4F36] text-white shadow-sm"><ClipboardCheck className="size-6" /></span>
            <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="truncate font-extrabold text-[#173C2A]">{item.schedule.activity.nombre}</span><EnrollmentBadge status={item.status} /></span><span className="mt-1 block truncate text-sm text-[#315644]/75">{item.schedule.day} · {item.schedule.startTime} a {item.schedule.endTime}</span><span className="mt-2 block truncate text-xs font-semibold text-[#315644]/65">{item.schedule.establishment.nombre}{item.waitlistPosition ? ` · Posición ${item.waitlistPosition}` : ""}</span></span>
            <ChevronRight className="size-5 text-[#819B56]" />
          </button>)}
          {!filtered.length ? <CatalogEmptyState title="No hay inscripciones registradas." description="Tus inscripciones aparecerán en este listado." filtered={Boolean(query.trim()) || status !== "all"} /> : null}
        </div>
      </div>
      <div className={cn(!selectedId && "hidden lg:block")}><EnrollmentDetail item={selected} onBack={() => setSelectedId("")} onCancel={(id) => setCancelId(id)} /></div>
    </section> : null}
    <ConfirmDialog open={cancelId !== null} title="¿Querés cancelar esta inscripción?" description="Tu lugar podrá asignarse a otra persona." confirmLabel="Cancelar inscripción" icon={<Trash2 />} onConfirm={cancel} onClose={() => setCancelId(null)} />
  </main>;
}

function EnrollmentDetail({ item, onBack, onCancel }: { item: CitizenEnrollment | null; onBack: () => void; onCancel: (id: string) => void }) {
  if (!item) return <aside className="hidden min-h-72 items-center justify-center rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-8 text-center text-sm font-semibold text-[#315644]/70 lg:flex">Seleccioná una inscripción para consultar su detalle.</aside>;
  const documentation = item.documentation ? DOCUMENTATION_STATUS[item.documentation.status] : null;
  const documentationHref = item.documentation?.status === "PENDIENTE"
    ? "/citizen/documents"
    : `/citizen/enrollments/${item.id}/documents`;
  const cancellable = ["CONFIRMADA", "LISTA_ESPERA", "PENDIENTE"].includes(item.status);
  return <aside className="h-fit rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-5 text-[#173C2A] shadow-sm sm:p-7 lg:sticky lg:top-0">
    <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[#1D4F36] lg:hidden"><ArrowLeft />Volver al listado</Button>
    <div className="flex items-start gap-4"><div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#1D4F36] text-white shadow-sm"><ClipboardCheck className="size-8" /></div><div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-extrabold text-[#1D4F36]">{item.schedule.activity.nombre}</h2><div className="mt-2"><EnrollmentBadge status={item.status} /></div></div></div>
    <dl className="mt-6 grid gap-3"><CatalogDetailField icon={CalendarClock} label="Día y horario">{item.schedule.day} · {item.schedule.startTime} a {item.schedule.endTime}</CatalogDetailField><CatalogDetailField icon={MapPin} label="Establecimiento">{item.schedule.establishment.nombre}</CatalogDetailField><CatalogDetailField icon={ClipboardCheck} label="Fecha de inscripción">{formatCatalogDate(item.enrollmentDate)}</CatalogDetailField>{item.waitlistPosition ? <CatalogDetailField icon={UsersRound} label="Lista de espera">Posición {item.waitlistPosition}</CatalogDetailField> : null}{item.nextSession ? <CatalogDetailField icon={CalendarClock} label="Próxima clase">{item.nextSession.date}</CatalogDetailField> : null}</dl>
    {item.documentation ? <div className="mt-5 rounded-2xl border border-[#C9D9C3] bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 font-extrabold text-[#1D4F36]"><FileCheck2 className="size-5" />Documentación</p><DocumentationStatusBadge summary={item.documentation} /></div><p className="mt-3 text-sm text-[#315644]">{documentation?.description}</p>{documentation?.action ? <Button asChild className="mt-4 h-11 rounded-xl bg-[#1D4F36] font-bold hover:bg-[#143A27]"><Link href={documentationHref}>{documentation.action}</Link></Button> : null}</div> : null}
    {cancellable ? <div className="mt-6 border-t border-[#C9D9C3] pt-5"><Button variant="outline" className="h-11 w-full rounded-xl border-red-200 bg-white font-bold text-red-700 hover:bg-red-50" onClick={() => onCancel(item.id)}><Trash2 />Cancelar inscripción</Button></div> : null}
  </aside>;
}

function EnrollmentBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 font-bold", status === "CONFIRMADA" ? "border-[#819B56]/40 bg-[#DDEED2] text-[#1D4F36]" : status === "PENDIENTE" || status === "LISTA_ESPERA" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[#B2B2B2] bg-[#B2B2B2]/15 text-[#555]")}>{enrollmentLabel[status] ?? status}</Badge>;
}
