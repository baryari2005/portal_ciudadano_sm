"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, ChevronRight, ClipboardCheck, FileCheck2, MapPin, Pencil, Trash2, UsersRound } from "lucide-react";
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
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";

const enrollmentLabel: Record<string, string> = { CONFIRMADA: "Confirmada", LISTA_ESPERA: "Lista de espera", PENDIENTE: "Pendiente", CANCELADA: "Cancelada", RECHAZADA: "Rechazada", BAJA: "Baja" };
type CitizenEnrollment = { id: string; status: string; enrollmentDate: string; waitlistPosition: number | null; schedule: { id:string;day: string; startTime: string; endTime: string; activity: { id: string; nombre: string; modalidadOperacion:string; imageUrl:string|null }; establishment: { id: string; nombre: string } }; selectedSchedules:Array<{id:string;day:string;startTime:string;endTime:string;establishment:{id:string;nombre:string}}>; nextSession: { id: string; date: string } | null; documentation: EnrollmentDocumentationSummary };

export function CitizenEnrollmentsPage() {
  const router = useRouter();
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

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
    <CatalogPageHeader title="Mis inscripciones" description="Consultá tus actividades, horarios, documentación y posiciones en lista de espera." total={items.length} />
    {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">No pudimos cargar tus inscripciones. <Button variant="ghost" onClick={retry}>Reintentar</Button></div> : null}
    {!error ? <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
      <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por actividad, sede o día..." />
          <CatalogFilterPopover sections={[{ id: "enrollment-status", title: "Estado", value: status, options: [{ value: "all", label: "Todas" }, { value: "CONFIRMADA", label: "Confirmadas" }, { value: "PENDIENTE", label: "Pendientes" }, { value: "LISTA_ESPERA", label: "Lista de espera" }, { value: "CANCELADA", label: "Canceladas" }, { value: "RECHAZADA", label: "Rechazadas" }, { value: "BAJA", label: "Bajas" }], onChange: setStatus }]} />
        </div>
        <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-290px)]">
          {filtered.map((item) => <button key={item.id} type="button" data-admin-list-card="" onClick={() => setSelectedId(item.id)} className={cn("grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]", selectedId === item.id ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] shadow-sm" : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)] hover:shadow-sm")}>
            {item.schedule.activity.imageUrl?<ActivityImagePreview source={item.schedule.activity.imageUrl} alt={`Imagen de ${item.schedule.activity.nombre}`} className="size-12 shrink-0 rounded-xl" />:<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm"><ClipboardCheck className="size-6" /></span>}
            <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="truncate font-extrabold text-[var(--brand-ink)]">{item.schedule.activity.nombre}</span><EnrollmentBadge status={item.status} /></span><span className="mt-1 block text-sm text-[var(--brand-text)]/75">{formatCitizenEnrollmentScheduleSummary(item)}</span><span className="mt-2 block truncate text-xs font-semibold text-[var(--brand-text)]/65">{item.schedule.establishment.nombre}{item.waitlistPosition ? ` · Posición ${item.waitlistPosition}` : ""}</span></span>
            <ChevronRight className="size-5 text-[var(--brand-secondary)]" />
          </button>)}
          {!filtered.length ? <CatalogEmptyState title="No hay inscripciones registradas." description="Tus inscripciones aparecerán en este listado." filtered={Boolean(query.trim()) || status !== "all"} /> : null}
        </div>
      </div>
      <div className={cn(!selectedId && "hidden lg:block")}><EnrollmentDetail item={selected} onBack={() => setSelectedId("")} onCancel={(id) => setCancelId(id)} onEditSchedules={(item)=>router.push(`/citizen/enrollments/${item.id}/schedule`)} /></div>
    </section> : null}
    <ConfirmDialog open={cancelId !== null} title="¿Querés cancelar esta inscripción?" description="Tu lugar podrá asignarse a otra persona." confirmLabel="Cancelar inscripción" icon={<Trash2 />} onConfirm={cancel} onClose={() => setCancelId(null)} />
  </main>;
}

function EnrollmentDetail({ item, onBack, onCancel, onEditSchedules }: { item: CitizenEnrollment | null; onBack: () => void; onCancel: (id: string) => void; onEditSchedules:(item:CitizenEnrollment)=>void }) {
  if (!item) return <aside className="hidden min-h-72 items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-8 text-center text-sm font-semibold text-[var(--brand-text)]/70 lg:flex">Seleccioná una inscripción para consultar su detalle.</aside>;
  const documentation = item.documentation ? DOCUMENTATION_STATUS[item.documentation.status] : null;
  const documentationHref = item.documentation?.status === "PENDIENTE"
    ? "/citizen/documents"
    : `/citizen/enrollments/${item.id}/documents`;
  const cancellable = ["CONFIRMADA", "LISTA_ESPERA", "PENDIENTE"].includes(item.status);
  const changeable = cancellable && item.schedule.activity.modalidadOperacion === "TURNO_RECURRENTE";
  return <aside className="h-fit rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 text-[var(--brand-ink)] shadow-sm sm:p-7 lg:sticky lg:top-0">
    <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[var(--brand-primary)] lg:hidden"><ArrowLeft />Volver al listado</Button>
    <div className="flex items-start gap-4">{item.schedule.activity.imageUrl?<ActivityImagePreview source={item.schedule.activity.imageUrl} alt={`Imagen de ${item.schedule.activity.nombre}`} className="size-16 shrink-0 rounded-2xl" />:<div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm"><ClipboardCheck className="size-8" /></div>}<div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-extrabold text-[var(--brand-primary)]">{item.schedule.activity.nombre}</h2><div className="mt-2"><EnrollmentBadge status={item.status} /></div></div></div>
    <dl className="mt-6 grid gap-3"><CatalogDetailField icon={CalendarClock} label="Días y horarios">{formatCitizenEnrollmentScheduleSummary(item)}</CatalogDetailField><CatalogDetailField icon={MapPin} label="Establecimiento">{item.schedule.establishment.nombre}</CatalogDetailField><CatalogDetailField icon={ClipboardCheck} label="Fecha de inscripción">{formatCatalogDate(item.enrollmentDate)}</CatalogDetailField>{item.waitlistPosition ? <CatalogDetailField icon={UsersRound} label="Lista de espera">Posición {item.waitlistPosition}</CatalogDetailField> : null}{item.nextSession ? <CatalogDetailField icon={CalendarClock} label="Próxima clase">{item.nextSession.date}</CatalogDetailField> : null}</dl>
    {item.documentation ? <div className="mt-5 rounded-2xl border border-[var(--brand-border)] bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><FileCheck2 className="size-5" />Documentación</p><DocumentationStatusBadge summary={item.documentation} /></div><p className="mt-3 text-sm text-[var(--brand-text)]">{documentation?.description}</p>{documentation?.action ? <Button asChild className="mt-4 h-11 rounded-xl bg-[var(--brand-primary)] font-bold hover:bg-[var(--brand-primary-hover)]"><Link href={documentationHref}>{documentation.action}</Link></Button> : null}</div> : null}
    {cancellable ? <div className={`mt-6 grid gap-3 border-t border-[var(--brand-border)] pt-5 ${changeable?"sm:grid-cols-2":""}`}>{changeable?<Button className="h-11 w-full rounded-xl bg-[var(--brand-primary)] font-bold hover:bg-[var(--brand-primary-hover)]" onClick={() => onEditSchedules(item)}><Pencil />Cambiar horarios</Button>:null}<Button variant="outline" className="h-11 w-full rounded-xl border-red-200 bg-white font-bold text-red-700 hover:bg-red-50" onClick={() => onCancel(item.id)}><Trash2 />Cancelar inscripción</Button></div> : null}
  </aside>;
}

function EnrollmentBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 font-bold", status === "CONFIRMADA" ? "border-[var(--brand-secondary)]/40 bg-[var(--brand-highlight)] text-[var(--brand-primary)]" : status === "PENDIENTE" || status === "LISTA_ESPERA" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[var(--brand-neutral)] bg-[var(--brand-neutral)]/15 text-[#555]")}>{enrollmentLabel[status] ?? status}</Badge>;
}

const enrollmentDayOrder=["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
const enrollmentDayLabels:Record<string,string>={LUNES:"Lun",MARTES:"Mar",MIERCOLES:"Mié",JUEVES:"Jue",VIERNES:"Vie",SABADO:"Sáb",DOMINGO:"Dom"};
function formatCitizenEnrollmentScheduleSummary(item:CitizenEnrollment){const schedules=item.selectedSchedules.length?item.selectedSchedules:[item.schedule];const groups=new Map<string,string[]>();schedules.slice().sort((a,b)=>enrollmentDayOrder.indexOf(a.day)-enrollmentDayOrder.indexOf(b.day)||a.startTime.localeCompare(b.startTime)).forEach(schedule=>{const time=schedule.startTime===schedule.endTime?schedule.startTime:`${schedule.startTime} a ${schedule.endTime}`;groups.set(time,[...(groups.get(time)??[]),enrollmentDayLabels[schedule.day]??schedule.day]);});return[...groups.entries()].map(([time,days])=>`${days.join(", ")} · ${time}`).join(" | ");}
