"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays, addMonths, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock3, List, Loader2, MapPin, SearchX, TicketCheck, UserRound, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CatalogDetailField, CatalogLoadingState, CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { citizenPost, loadCitizenSchedule } from "../services/citizen.service";
import type { CitizenSchedule, CitizenScheduleDisplayStatus, CitizenScheduleItem } from "../types/citizen-schedule.types";

const STATUS_VISUAL: Record<CitizenScheduleDisplayStatus, { label: string; className: string }> = {
  CONFIRMADA: { label: "Confirmada", className: "border-[#819B56]/40 bg-[#DDEED2] text-[#1D4F36]" },
  PENDIENTE: { label: "Pendiente", className: "border-amber-300 bg-amber-50 text-amber-900" },
  LISTA_ESPERA: { label: "Lista de espera", className: "border-sky-300 bg-sky-50 text-sky-900" },
  CANCELADA: { label: "Cancelada", className: "border-red-300 bg-red-50 text-red-800" },
  PRESENTE: { label: "Presente", className: "border-[#819B56]/40 bg-[#DDEED2] text-[#1D4F36]" },
  AUSENTE: { label: "Ausente", className: "border-red-300 bg-red-50 text-red-800" },
  JUSTIFICADA: { label: "Ausente con justificación", className: "border-amber-300 bg-amber-50 text-amber-900" },
  ASISTENCIA_PENDIENTE: { label: "Asistencia pendiente", className: "border-[#B2B2B2] bg-[#F2F2F2] text-[#555]" },
};
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CitizenSchedulePage() {
  const searchParams = useSearchParams();
  const requestedClassId = searchParams.get("classId");
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<CitizenSchedule | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const monthStart = startOfMonth(visibleMonth);
  const monthKey = format(monthStart, "yyyy-MM");
  const dateFrom = format(monthStart, "yyyy-MM-dd");
  const dateTo = format(endOfMonth(monthStart), "yyyy-MM-dd");

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setSelectedId("");
    setLoading(true);
    setError(false);
    void loadCitizenSchedule(monthKey, dateFrom, dateTo, controller.signal)
      .then((schedule) => {
        setData(schedule);
        if (requestedClassId && schedule.items.some((item) => item.id === requestedClassId)) setSelectedId(requestedClassId);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [monthKey, dateFrom, dateTo, retryKey, requestedClassId]);

  const grouped = useMemo(() => {
    const result = new Map<string, CitizenScheduleItem[]>();
    for (const item of data?.items ?? []) result.set(item.date, [...(result.get(item.date) ?? []), item]);
    return [...result.entries()];
  }, [data]);
  const selected = data?.items.find((item) => item.id === selectedId) ?? null;

  if (loading) return <CatalogLoadingState label="próximas clases" fullPage />;

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
      <CatalogPageHeader
        title="Próximas clases"
        description="Consultá las clases correspondientes a tus inscripciones."
        total={data?.total ?? 0}
      />

      <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-[#C9D9C3] bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-[#DDEED2] text-[#1D4F36] sm:grid">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#819B56]">Período de consulta</p>
            <div className="mt-1 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
              <Button type="button" size="icon" variant="outline" aria-label="Mes anterior" className="size-10 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] text-[#1D4F36] hover:border-[#819B56] hover:bg-[#EEF6E9]" onClick={() => setVisibleMonth((month) => addMonths(month, -1))}>
                <ChevronLeft className="size-5" />
              </Button>
              <h2 className="min-w-36 text-center text-lg font-extrabold capitalize text-[#1D4F36] sm:min-w-44 sm:text-xl">{format(visibleMonth, "MMMM yyyy", { locale: es })}</h2>
              <Button type="button" size="icon" variant="outline" aria-label="Mes siguiente" className="size-10 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] text-[#1D4F36] hover:border-[#819B56] hover:bg-[#EEF6E9]" onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E5EEE1] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#819B56]">Visualización</p>
          <div className="grid grid-cols-2 rounded-xl border border-[#DDE8D7] bg-[#EEF6E9] p-1" aria-label="Tipo de vista">
            <Button type="button" size="sm" variant="ghost" aria-pressed={view === "list"} className={cn("h-10 rounded-lg px-4 font-bold text-[#315644]", view === "list" && "bg-[#1D4F36] text-white shadow-sm hover:bg-[#143A27] hover:text-white")} onClick={() => setView("list")}><List className="size-4" />Listado</Button>
            <Button type="button" size="sm" variant="ghost" aria-pressed={view === "calendar"} className={cn("h-10 rounded-lg px-4 font-bold text-[#315644]", view === "calendar" && "bg-[#1D4F36] text-white shadow-sm hover:bg-[#143A27] hover:text-white")} onClick={() => setView("calendar")}><CalendarRange className="size-4" />Calendario</Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800">
          No pudimos cargar las clases de este mes. <Button variant="ghost" onClick={() => setRetryKey((value) => value + 1)}>Reintentar</Button>
        </div>
      ) : (
        <section className={cn("mt-6 grid min-h-0 gap-6", view === "list" ? "lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]" : "xl:grid-cols-[minmax(620px,1.4fr)_minmax(340px,0.6fr)]")}>
          <div className={cn("min-h-0 flex-col", selectedId ? "hidden lg:flex" : "flex")}>
            {view === "calendar" ? (
              <CalendarView month={visibleMonth} items={data?.items ?? []} selectedId={selectedId} onSelect={setSelectedId} />
            ) : <div className="grid gap-4 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-320px)]">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#819B56]">{format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}</p>
                  <div className="grid gap-3">
                    {items.map((item) => <ScheduleCard key={item.id} item={item} active={item.id === selectedId} onClick={() => setSelectedId(item.id)} />)}
                  </div>
                </div>
              ))}
              {!grouped.length ? (
                <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-[#C9D9C3] bg-white/70 p-8 text-center">
                  <div><SearchX className="mx-auto size-9 text-[#819B56]" /><p className="mt-3 font-extrabold text-[#1D4F36]">No hay clases este mes</p><p className="mt-1 text-sm text-[#5F6F68]">Podés consultar el mes anterior o el siguiente.</p></div>
                </div>
              ) : null}
            </div>}
          </div>
          <div className={cn(!selectedId && "hidden lg:block")}><ScheduleDetail item={selected} onBack={() => setSelectedId("")} onChanged={() => setRetryKey((value) => value + 1)} /></div>
        </section>
      )}
    </main>
  );
}

function CalendarView({ month, items, selectedId, onSelect }: { month: Date; items: CitizenScheduleItem[]; selectedId: string; onSelect: (id: string) => void }) {
  const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) days.push(day);
  const eventsByDate = new Map<string, CitizenScheduleItem[]>();
  for (const item of items) eventsByDate.set(item.date, [...(eventsByDate.get(item.date) ?? []), item]);

  return (
    <div className="overflow-x-auto rounded-3xl border border-[#DDE8D7] bg-white shadow-sm">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-7 bg-[#EEF6E9]">
          {WEEK_DAYS.map((day) => <div key={day} className="border-b border-r border-[#DDE8D7] px-2 py-3 text-center text-xs font-extrabold uppercase text-[#1D4F36] last:border-r-0">{day}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const inMonth = day.getMonth() === month.getMonth();
            return (
              <div key={dateKey} className={cn("min-h-36 border-b border-r border-[#DDE8D7] p-2", inMonth ? "bg-white" : "bg-[#F7F7F7] text-[#B2B2B2]")}>
                <time dateTime={dateKey} className="text-xs font-extrabold">{format(day, "d")}</time>
                <div className="mt-2 grid gap-1.5">
                  {(eventsByDate.get(dateKey) ?? []).map((item) => {
                    const visual = STATUS_VISUAL[item.displayStatus];
                    return (
                      <button key={item.id} type="button" onClick={() => onSelect(item.id)} className={cn("rounded-lg border p-2 text-left transition hover:border-[#819B56]", selectedId === item.id ? "border-[#1D4F36] bg-[#DDEED2]" : "border-[#C9D9C3] bg-[#F7FBF5]")}>
                        <span className="block truncate text-[11px] font-extrabold text-[#173C2A]">{item.activity.name}</span>
                        <span className="mt-0.5 block text-[10px] font-bold text-[#315644]">{item.startTime} · {visual.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ item, active, onClick }: { item: CitizenScheduleItem; active: boolean; onClick: () => void }) {
  return (
    <button type="button" data-admin-list-card="" onClick={onClick} className={cn("grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#819B56]", active ? "border-[#1D4F36] bg-[#EEF6E9] shadow-sm" : "border-[#DDE8D7] bg-white hover:border-[#819B56] hover:shadow-sm")}>
      <span className="grid size-12 place-items-center rounded-xl bg-[#1D4F36] text-white shadow-sm"><CalendarDays className="size-6" /></span>
      <span className="min-w-0"><span className="block truncate font-extrabold text-[#173C2A]">{item.activity.name}</span><span className="mt-1 block text-sm font-semibold text-[#315644]">{item.startTime} a {item.endTime}</span><span className="mt-1 block truncate text-xs text-[#5F6F68]">{item.establishment.name}</span></span>
      <span className="flex flex-col items-end gap-2"><StatusBadge status={item.displayStatus} /><ChevronRight className="size-5 text-[#819B56]" /></span>
    </button>
  );
}

function ScheduleDetail({ item, onBack, onChanged }: { item: CitizenScheduleItem | null; onBack: () => void; onChanged: () => void }) {
  const [working, setWorking] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  if (!item) return <aside className="hidden min-h-72 items-center justify-center rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-8 text-center text-sm font-semibold text-[#315644]/70 lg:flex">Seleccioná una clase para consultar su detalle.</aside>;

  async function action(path: string, success: string, body?: unknown) {
    setWorking(true);
    try { await citizenPost(path, body); toast.success(success); setCancelOpen(false); setReason(""); setProof(null); onChanged(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "No pudimos completar la acción."); }
    finally { setWorking(false); }
  }

  const reservation = item.reservation;
  function cancelBody() { if (!proof) return { reason: reason.trim() }; const form = new FormData(); form.set("reason", reason.trim()); form.set("proof", proof); return form; }
  return (
    <><aside className="h-fit rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-5 text-[#173C2A] shadow-sm sm:p-7 lg:sticky lg:top-0">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[#1D4F36] lg:hidden"><ArrowLeft />Volver al listado</Button>
      <div className="flex items-start gap-4"><span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#1D4F36] text-white shadow-sm"><CalendarDays className="size-8" /></span><div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-extrabold text-[#1D4F36]">{item.activity.name}</h2><div className="mt-2"><StatusBadge status={item.displayStatus} /></div></div></div>
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={CalendarDays} label="Fecha">{format(parseISO(item.date), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}</CatalogDetailField>
        <CatalogDetailField icon={Clock3} label="Horario">{item.startTime} a {item.endTime}</CatalogDetailField>
        <CatalogDetailField icon={MapPin} label="Establecimiento">{item.establishment.name}{item.space ? ` · ${item.space}` : ""}</CatalogDetailField>
        <CatalogDetailField icon={UserRound} label="Profesor">{item.primaryProfessor || "Sin profesor asignado"}</CatalogDetailField>
        {item.activity.enrollmentMode === "POR_CLASE" ? <CatalogDetailField icon={TicketCheck} label="Cupos">{Math.max(item.capacity - item.reservedCount, 0)} disponibles de {item.capacity}</CatalogDetailField> : null}
      </dl>
      {reservation?.status === "AUSENCIA_INFORMADA" ? <p className="mt-5 rounded-2xl border border-[#C9D9C3] bg-white p-4 text-sm font-bold text-[#315644]">Informaste que no asistirás. {reservation.justified ? "La ausencia quedó justificada." : "La cancelación fue realizada fuera del plazo de justificación."}</p> : null}
      <div className="mt-6 grid gap-3 border-t border-[#C9D9C3] pt-5">
        {item.activity.enrollmentMode === "POR_CLASE" && !reservation ? <Button disabled={working} className="h-11 rounded-xl bg-[#1D4F36] font-bold hover:bg-[#143A27]" onClick={() => void action(`/classes/${item.id}/reserve`, "Reserva registrada.")}>{working ? <Loader2 className="animate-spin" /> : <TicketCheck />}Reservar esta clase</Button> : null}
        {reservation?.status === "LISTA_ESPERA" ? <p className="rounded-xl bg-sky-50 p-3 text-center text-sm font-bold text-sky-900">Estás en la lista de espera de esta clase.</p> : null}
        {reservation?.status === "OFRECIDA" ? <Button disabled={working} className="h-11 rounded-xl bg-[#1D4F36] font-bold hover:bg-[#143A27]" onClick={() => void action(`/classes/${item.id}/confirm`, "Cupo confirmado.")}>{working ? <Loader2 className="animate-spin" /> : <TicketCheck />}Confirmar cupo disponible</Button> : null}
        {(item.activity.enrollmentMode !== "POR_CLASE" || reservation?.status === "RESERVADA") && reservation?.status !== "AUSENCIA_INFORMADA" ? <Button variant="outline" className="h-11 rounded-xl border-red-200 bg-white font-bold text-red-700 hover:bg-red-50" onClick={() => setCancelOpen(true)}><XCircle />No asistiré a esta clase</Button> : null}
      </div>
    </aside>
    <Dialog open={cancelOpen} onOpenChange={(open) => !working && setCancelOpen(open)}><DialogContent className="rounded-3xl border-[#C9D9C3]"><DialogHeader><DialogTitle className="text-[#1D4F36]">Informar inasistencia</DialogTitle><DialogDescription>El cupo se libera inmediatamente. Con {item.activity.cancellationNoticeHours} horas o más de anticipación quedará justificada automáticamente.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="absence-reason" className="font-extrabold">Motivo</Label><Textarea id="absence-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Contanos por qué no podés asistir" className="min-h-28 rounded-xl border-[#C9D9C3]" /></div><div className="space-y-2"><Label htmlFor="absence-proof" className="font-extrabold">Comprobante (opcional)</Label><Input id="absence-proof" type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setProof(event.target.files?.[0] ?? null)} /><p className="text-xs text-[#5F6F68]">PDF, JPG o PNG · máximo 10 MB.</p></div><DialogFooter><Button variant="outline" disabled={working} onClick={() => setCancelOpen(false)}>Volver</Button><Button disabled={working || reason.trim().length < 3} className="bg-[#1D4F36] hover:bg-[#143A27]" onClick={() => void action(`/classes/${item.id}/cancel`, "Inasistencia registrada.", cancelBody())}>{working ? <Loader2 className="animate-spin" /> : <XCircle />}Confirmar</Button></DialogFooter></DialogContent></Dialog></>
  );
}

function StatusBadge({ status }: { status: CitizenScheduleDisplayStatus }) {
  const visual = STATUS_VISUAL[status];
  return <Badge variant="outline" className={cn("w-fit rounded-full px-2.5 py-1 font-bold", visual.className)}>{visual.label}</Badge>;
}
