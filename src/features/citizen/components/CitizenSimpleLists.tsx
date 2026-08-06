"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Clock3, FileText, ListChecks, MapPin, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CatalogDetailField, CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogSearchInput, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { useCitizenData } from "./CitizenPrimitives";

const STATUS: Record<string, { label: string; className: string }> = {
  PRESENTE: { label: "Presente", className: "border-[var(--brand-secondary)]/40 bg-[var(--brand-highlight)] text-[var(--brand-primary)]" },
  AUSENTE: { label: "Ausente", className: "border-red-300 bg-red-50 text-red-800" },
  JUSTIFICADA: { label: "Justificada", className: "border-amber-300 bg-amber-50 text-amber-900" },
};

type CitizenAttendance = {
  id: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  justificationReason: string | null;
  activity: { id: string; nombre: string };
  establishment: { id: string; nombre: string };
};

export function CitizenAttendancePage() {
  const { data, loading, error, retry } = useCitizenData<CitizenAttendance[]>("/attendance");
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const items = data ?? [];
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((item) =>
      (status === "all" || item.status === status) &&
      (!search || `${item.activity.nombre} ${item.establishment.nombre} ${item.date}`.toLowerCase().includes(search)),
    );
  }, [items, query, status]);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (loading) return <CatalogLoadingState label="asistencias" fullPage />;

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <CatalogPageHeader title="Mi asistencia" description="Consultá tu historial de participación en las actividades." total={items.length} />

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          No pudimos cargar tus asistencias. <Button variant="ghost" onClick={retry}>Reintentar</Button>
        </div>
      ) : (
        <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
          <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por actividad, sede o fecha..." />
              <CatalogFilterPopover sections={[{
                id: "attendance-status",
                title: "Estado",
                value: status,
                options: [
                  { value: "all", label: "Todas" },
                  { value: "PRESENTE", label: "Presentes" },
                  { value: "AUSENTE", label: "Ausentes" },
                  { value: "JUSTIFICADA", label: "Justificadas" },
                ],
                onChange: setStatus,
              }]} />
            </div>

            <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-290px)]">
              {filtered.map((item) => (
                <button key={item.id} type="button" data-admin-list-card="" onClick={() => setSelectedId(item.id)} className={cn("grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]", selectedId === item.id ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] shadow-sm" : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)] hover:shadow-sm")}>
                  <AttendanceIcon status={item.status} />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><span className="truncate font-extrabold text-[var(--brand-ink)]">{item.activity.nombre}</span><AttendanceBadge status={item.status} /></span>
                    <span className="mt-1 block text-sm font-semibold text-[var(--brand-text)]">{formatCatalogDate(item.date)} · {item.startTime} a {item.endTime}</span>
                    <span className="mt-1 block truncate text-xs text-[var(--brand-muted)]">{item.establishment.nombre}</span>
                  </span>
                  <ChevronRight className="size-5 text-[var(--brand-secondary)]" />
                </button>
              ))}
              {!filtered.length ? <CatalogEmptyState title="No hay asistencias registradas." description="Tu historial de asistencias aparecerá en este listado." filtered={Boolean(query.trim()) || status !== "all"} /> : null}
            </div>
          </div>
          <div className={cn(!selectedId && "hidden lg:block")}><AttendanceDetail item={selected} onBack={() => setSelectedId("")} /></div>
        </section>
      )}
    </main>
  );
}

function AttendanceDetail({ item, onBack }: { item: CitizenAttendance | null; onBack: () => void }) {
  if (!item) return <aside className="hidden min-h-72 items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-8 text-center text-sm font-semibold text-[var(--brand-text)]/70 lg:flex">Seleccioná una asistencia para consultar su detalle.</aside>;
  return (
    <aside className="h-fit rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 text-[var(--brand-ink)] shadow-sm sm:p-7 lg:sticky lg:top-0">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[var(--brand-primary)] lg:hidden"><ArrowLeft />Volver al listado</Button>
      <div className="flex items-start gap-4">
        <AttendanceIcon status={item.status} large />
        <div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-extrabold text-[var(--brand-primary)]">{item.activity.nombre}</h2><div className="mt-2"><AttendanceBadge status={item.status} /></div></div>
      </div>
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={CalendarDays} label="Fecha">{formatCatalogDate(item.date)}</CatalogDetailField>
        <CatalogDetailField icon={Clock3} label="Horario">{item.startTime} a {item.endTime}</CatalogDetailField>
        <CatalogDetailField icon={MapPin} label="Establecimiento">{item.establishment.nombre}</CatalogDetailField>
        {item.justificationReason ? <CatalogDetailField icon={FileText} label="Motivo de la justificación">{item.justificationReason}</CatalogDetailField> : null}
      </dl>
    </aside>
  );
}

function AttendanceIcon({ status, large = false }: { status: string; large?: boolean }) {
  const Icon = status === "PRESENTE" ? CheckCircle2 : status === "AUSENTE" ? XCircle : ListChecks;
  return <span className={cn("grid shrink-0 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm", large ? "size-16 rounded-2xl" : "size-12")}><Icon className={large ? "size-8" : "size-6"} /></span>;
}

function AttendanceBadge({ status }: { status: string }) {
  const visual = STATUS[status] ?? { label: status, className: "border-[var(--brand-neutral)] bg-[#F2F2F2] text-[#555]" };
  return <Badge variant="outline" className={cn("w-fit rounded-full px-2.5 py-1 font-bold", visual.className)}>{visual.label}</Badge>;
}
