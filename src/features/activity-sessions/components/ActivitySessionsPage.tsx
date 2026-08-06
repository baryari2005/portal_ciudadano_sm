"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarClock, CalendarDays, ChevronRight, MapPin, PauseCircle, PlayCircle, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel, AdminListCard, AdminPageShell, adminControlClass } from "@/components/shared/admin-patterns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATALOG_PAGE_SIZE, CatalogDetailField, CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogPagination, CatalogSearchInput, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { listActivitySchedulesClient } from "@/features/activity-schedules/services/activity-schedules.service";
import type { ActivitySchedule } from "@/features/activity-schedules/types/activity-schedule.types";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { formatSessionDate, sessionStatusLabel } from "../helpers/activity-session-display";
import { useActivitySessions } from "../hooks/useActivitySessions";
import { ACTIVITY_SESSION_STATUSES } from "../schemas/activity-session.schema";
import { changeActivitySessionStatusClient } from "../services/activity-sessions.service";
import type { ActivitySession, ActivitySessionStatus } from "../types/activity-session.types";

const unique = (rows: string[][]) => [...new Map(rows.map((row) => [row[0], row])).values()];

export function ActivitySessionsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const canState = useCan("activity_sessions", "eliminar");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [scheduleId, setScheduleId] = useState(params.get("activityScheduleId") ?? "all");
  const [activityId, setActivityId] = useState(params.get("activityId") ?? "all");
  const [establishmentId, setEstablishmentId] = useState(params.get("establishmentId") ?? "all");
  const [professorId, setProfessorId] = useState(params.get("professorId") ?? "all");
  const [dateFrom, setDateFrom] = useState(params.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(params.get("dateTo") ?? "");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => { void listActivitySchedulesClient().then(setSchedules).catch(() => undefined); }, []);
  const filters = useMemo(() => ({ search: search || undefined, status: status === "all" ? undefined : status as ActivitySessionStatus, activityId: activityId === "all" ? undefined : activityId, activityScheduleId: scheduleId === "all" ? undefined : scheduleId, establishmentId: establishmentId === "all" ? undefined : establishmentId, professorId: professorId === "all" ? undefined : professorId, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, pageSize: CATALOG_PAGE_SIZE }), [search, status, activityId, scheduleId, establishmentId, professorId, dateFrom, dateTo, page]);
  const { data, meta, loading, error, refresh } = useActivitySessions(filters);
  const selected = data.find((item) => item.id === selectedId) ?? data[0] ?? null;

  useEffect(() => { if (!loading) setInitialized(true); }, [loading]);
  useEffect(() => {
    const query = new URLSearchParams();
    Object.entries({ search, status, activityId, activityScheduleId: scheduleId, establishmentId, professorId, dateFrom, dateTo }).forEach(([key, value]) => { if (value && value !== "all") query.set(key, value); });
    router.replace(`/activity-sessions${query.size ? `?${query}` : ""}`, { scroll: false });
  }, [search, status, activityId, scheduleId, establishmentId, professorId, dateFrom, dateTo, router]);
  useEffect(() => setPage(1), [search, status, scheduleId, activityId, establishmentId, professorId, dateFrom, dateTo]);

  if (!initialized && loading) return <CatalogLoadingState label="clases programadas" fullPage />;
  const sections = [
    { id: "status", title: "Estado", value: status, options: [["all", "Todos"], ...ACTIVITY_SESSION_STATUSES.map((item) => [item, sessionStatusLabel(item)])].map(([value, label]) => ({ value, label })), onChange: setStatus },
    { id: "dates", title: "Fechas", value: dateFrom || dateTo ? "custom" : "all", active: Boolean(dateFrom || dateTo), options: undefined, onChange: () => undefined, onClear: () => { setDateFrom(""); setDateTo(""); }, content: <div className="grid gap-3"><label className="space-y-1.5"><span className="text-sm font-bold text-[var(--brand-ink)]">Desde</span><Input className={adminControlClass} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label className="space-y-1.5"><span className="text-sm font-bold text-[var(--brand-ink)]">Hasta</span><Input className={adminControlClass} type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label></div> },
    { id: "activity", title: "Actividad", value: activityId, options: [["all", "Todas"], ...unique(schedules.map((item) => [item.activity.id, item.activity.name]))].map(([value, label]) => ({ value, label })), onChange: setActivityId },
    { id: "schedule", title: "Programación", value: scheduleId, options: [["all", "Todas"], ...schedules.map((item) => [item.id, `${item.activity.name} · ${item.day} ${item.startTime}`])].map(([value, label]) => ({ value, label })), onChange: setScheduleId },
    { id: "establishment", title: "Establecimiento", value: establishmentId, options: [["all", "Todos"], ...unique(schedules.map((item) => [item.establishment.id, item.establishment.name]))].map(([value, label]) => ({ value, label })), onChange: setEstablishmentId },
    { id: "professor", title: "Profesor", value: professorId, options: [["all", "Todos"], ...unique(schedules.flatMap((item) => item.professors.map((professor) => [professor.id, professor.fullName])))].map(([value, label]) => ({ value, label })), onChange: setProfessorId },
  ];

  async function change(value: ActivitySessionStatus, cancellationReason?: string) {
    if (!selected) return;
    try { await changeActivitySessionStatusClient(selected.id, value, cancellationReason); toast.success(value === "SUSPENDIDA" ? "Clase suspendida y participantes notificados." : value === "CANCELADA" ? "Clase cancelada y participantes notificados." : "Clase reactivada y participantes notificados."); await refresh(); }
    catch (caught: any) { toast.error(caught?.response?.data?.message || "No pudimos actualizar el estado."); throw caught; }
  }

  const filtered = Boolean(search || status !== "all" || scheduleId !== "all" || activityId !== "all" || establishmentId !== "all" || professorId !== "all" || dateFrom || dateTo);
  return <AdminPageShell>
    <CatalogPageHeader icon={CalendarDays} title="Clases" description="Consultá las clases generadas desde las actividades y administrá únicamente sus excepciones." total={meta.total} />
    <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,.95fr)_minmax(420px,1.05fr)]">
      <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><CatalogSearchInput value={search} onChange={setSearch} placeholder="Buscar actividad, sede, espacio o profesor..." /><CatalogFilterPopover sections={sections} /></div>
        {loading ? <div className="grid min-h-64 place-items-center"><CatalogLoadingState label="clases" /></div> : error || data.length === 0 ? <CatalogEmptyState title={error ? "No pudimos cargar las clases." : "No se encontraron clases."} description={error ? "Reintentá nuevamente en unos instantes." : "Las clases se generan desde la programación de cada actividad."} filtered={filtered} /> : <div className="flex min-h-0 flex-col gap-3"><div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-300px)]">{data.map((item) => <AdminListCard key={item.id} onClick={() => setSelectedId(item.id)} selected={selected?.id === item.id} leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm"><CalendarDays className="size-6" /></span>} title={item.activitySchedule.activity.name} badges={<SessionState value={item.status} />} description={<span className="flex items-center gap-1"><MapPin className="size-3.5" />{item.establishment.name}{item.space ? ` · ${item.space}` : ""}</span>} meta={`${formatSessionDate(item.date)} · ${item.startTime} a ${item.endTime}`} trailing={<ChevronRight className="size-5" />} />)}</div><CatalogPagination page={page} total={meta.total} onPageChange={setPage} /></div>}
      </div>
      <div className={cn(!selectedId && "hidden lg:block")}><SessionDetail item={selected} canState={canState} onBack={() => setSelectedId("")} onChange={change} /></div>
    </section>
  </AdminPageShell>;
}

function SessionDetail({ item, canState, onBack, onChange }: { item: ActivitySession | null; canState: boolean; onBack: () => void; onChange: (value: ActivitySessionStatus, reason?: string) => Promise<void> }) {
  const [action, setAction] = useState<"suspend" | "reactivate" | "cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  if (!item) return <AdminDetailPanel empty="Seleccioná una clase para consultar su detalle." />;

  const close = () => { if (!saving) { setAction(null); setReason(""); } };
  async function confirm() {
    if (!action) return;
    setSaving(true);
    try { await onChange(action === "suspend" ? "SUSPENDIDA" : action === "cancel" ? "CANCELADA" : "PROGRAMADA", action === "reactivate" ? undefined : reason.trim()); setAction(null); setReason(""); }
    finally { setSaving(false); }
  }
  const requiresReason = action === "suspend" || action === "cancel";

  return <><AdminDetailPanel onBack={onBack}><AdminDetailHeader title={item.activitySchedule.activity.name} subtitle={`${formatSessionDate(item.date)} · ${item.startTime} a ${item.endTime}`} leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm"><CalendarDays className="size-8" /></span>} badge={<SessionState value={item.status} />} />
    <dl className="mt-6 grid gap-3"><CatalogDetailField icon={CalendarClock} label="Fecha y hora">{formatSessionDate(item.date)} · {item.startTime} a {item.endTime}</CatalogDetailField><CatalogDetailField icon={Building2} label="Establecimiento">{item.establishment.name} · {item.establishment.address}</CatalogDetailField><CatalogDetailField icon={Users} label="Profesores">{item.professors.map((professor) => professor.fullName).join(", ") || "Sin profesores"}</CatalogDetailField><CatalogDetailField icon={Users} label="Participación">{item.enrollmentSummary.confirmedCount} confirmados · {item.enrollmentSummary.waitlistCount} en espera</CatalogDetailField>{item.cancellationReason ? <CatalogDetailField icon={XCircle} label={item.status === "SUSPENDIDA" ? "Motivo de suspensión" : "Motivo de cancelación"}>{item.cancellationReason}</CatalogDetailField> : null}<CatalogDetailField icon={CalendarClock} label="Registro">Creada {formatCatalogDate(item.createdAt)} · Actualizada {formatCatalogDate(item.updatedAt)}</CatalogDetailField></dl>
    {canState && !["CANCELADA", "FINALIZADA"].includes(item.status) ? <AdminDetailActions>{item.status === "SUSPENDIDA" ? <Button onClick={() => setAction("reactivate")} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"><PlayCircle />Reactivar</Button> : <Button variant="outline" onClick={() => setAction("suspend")}><PauseCircle />Suspender</Button>}<Button variant="outline" className="text-red-700 hover:bg-red-50" onClick={() => setAction("cancel")}><XCircle />Cancelar</Button></AdminDetailActions> : null}
  </AdminDetailPanel><ConfirmDialog open={Boolean(action)} title={action === "suspend" ? "Suspender clase" : action === "cancel" ? "Cancelar clase" : "Reactivar clase"} description={action === "reactivate" ? "La clase volverá a estar programada y se notificará a sus participantes." : `Se guardará el motivo y se notificará automáticamente a las personas inscriptas${action === "cancel" ? ". La clase no generará ausencias" : ""}.`} confirmLabel={action === "suspend" ? "Suspender y notificar" : action === "cancel" ? "Cancelar y notificar" : "Reactivar y notificar"} cancelLabel="Volver" loading={saving} confirmDisabled={requiresReason && reason.trim().length < 3} icon={action === "suspend" ? <PauseCircle /> : action === "reactivate" ? <PlayCircle /> : <XCircle />} onClose={close} onConfirm={() => void confirm()}>{requiresReason ? <div className="space-y-2"><Label className="font-bold text-[var(--brand-ink)]">Motivo de {action === "suspend" ? "suspensión" : "cancelación"}</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-28 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)]" placeholder="Detallá el motivo para informar a las personas inscriptas." /></div> : null}</ConfirmDialog></>;
}

function SessionState({ value }: { value: ActivitySessionStatus }) {
  const styles: Record<ActivitySessionStatus, string> = {
    PROGRAMADA: "border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)]",
    EN_CURSO: "border-sky-300 bg-sky-50 text-sky-800",
    FINALIZADA: "border-[var(--brand-neutral)] bg-[var(--brand-neutral)]/15 text-[#555]",
    SUSPENDIDA: "border-amber-300 bg-amber-50 text-amber-800",
    CANCELADA: "border-red-300 bg-red-50 text-red-800",
  };
  return <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 font-bold", styles[value])}>{sessionStatusLabel(value)}</Badge>;
}
