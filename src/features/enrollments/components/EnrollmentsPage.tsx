"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarClock, CheckSquare, ChevronRight, ClipboardCheck, Edit3, Mail, UserRound, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel, AdminListCard, AdminListPane, AdminPageShell, AdminSplitLayout, adminControlClass } from "@/components/shared/admin-patterns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATALOG_PAGE_SIZE, CatalogDetailField, CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogPagination, CatalogSearchInput, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { listActivitySchedulesClient } from "@/features/activity-schedules/services/activity-schedules.service";
import type { ActivitySchedule } from "@/features/activity-schedules/types/activity-schedule.types";
import { useCan } from "@/hooks/useCan";
import { enrollmentStatusLabel } from "../helpers/enrollment-display";
import { useEnrollments } from "../hooks/useEnrollments";
import { changeEnrollmentStatusClient } from "../services/enrollments.service";
import type { Enrollment, EnrollmentStatus } from "../types/enrollment.types";
import { DocumentationStatusBadge } from "@/features/enrollment-documents/components/DocumentationStatusBadge";
import { DOCUMENTATION_STATUS } from "@/features/enrollment-documents/helpers/documentation-status";

const statusOptions = [["all", "Todos"], ["PENDIENTE", "Pendiente"], ["CONFIRMADA", "Confirmada"], ["LISTA_ESPERA", "Lista de espera"], ["CANCELADA", "Cancelada"], ["RECHAZADA", "Rechazada"], ["BAJA", "Baja"]];
const dayOptions = [["all", "Todos"], ["LUNES", "Lunes"], ["MARTES", "Martes"], ["MIERCOLES", "Miércoles"], ["JUEVES", "Jueves"], ["VIERNES", "Viernes"], ["SABADO", "Sábado"], ["DOMINGO", "Domingo"]];
const options = (rows: Array<[string, string]>, allLabel: string) => [["all", allLabel], ...new Map(rows).values()].map(([value, label]) => ({ value, label }));

export function EnrollmentsPage({ userId: userIdProp, embedded = false, onLoadingChange, basePath = "/enrollments" }: { userId?: string; embedded?: boolean; onLoadingChange?: (loading: boolean) => void; basePath?: string } = {}) {
  const router = useRouter(); const params = useSearchParams();
  const userId = userIdProp ?? params.get("userId") ?? undefined;
  const canCreate = useCan("enrollments", "crear"); const canEdit = useCan("enrollments", "editar"); const canDelete = useCan("enrollments", "eliminar"); const canAssign = useCan("enrollments", "asignar");
  const canViewDocuments = useCan("enrollment_documents", "ver");
  const [search, setSearch] = useState(params.get("search") ?? ""); const [status, setStatus] = useState(params.get("status") ?? "all"); const [page, setPage] = useState(Number(params.get("page")) || 1); const [selectedId, setSelectedId] = useState<string | null>(null); const [initialized, setInitialized] = useState(false);
  const [activityId, setActivityId] = useState(params.get("activityId") ?? "all"); const [scheduleId, setScheduleId] = useState(params.get("activityScheduleId") ?? "all"); const [establishmentId, setEstablishmentId] = useState(params.get("establishmentId") ?? "all"); const [professorId, setProfessorId] = useState(params.get("professorId") ?? "all"); const [day, setDay] = useState(params.get("day") ?? "all"); const [dateFrom, setDateFrom] = useState(params.get("dateFrom") ?? ""); const [dateTo, setDateTo] = useState(params.get("dateTo") ?? ""); const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);
  useEffect(() => { listActivitySchedulesClient().then(setSchedules).catch(() => undefined); }, []);
  useEffect(() => { if (embedded) return; const timer = window.setTimeout(() => { const next = new URLSearchParams(); const values = { search, status, activityId, activityScheduleId: scheduleId, establishmentId, professorId, day, dateFrom, dateTo }; Object.entries(values).forEach(([key, value]) => { if (value && value !== "all") next.set(key, value); }); if (userId) next.set("userId", userId); if (page > 1) next.set("page", String(page)); router.replace(`${basePath}${next.size ? `?${next}` : ""}`, { scroll: false }); }, 300); return () => window.clearTimeout(timer); }, [search, status, activityId, scheduleId, establishmentId, professorId, day, dateFrom, dateTo, page, router, userId, embedded, basePath]);
  const filters = useMemo(() => ({ search: search || undefined, status: status === "all" ? undefined : status as EnrollmentStatus, userId, activityId: activityId === "all" ? undefined : activityId, activityScheduleId: scheduleId === "all" ? undefined : scheduleId, establishmentId: establishmentId === "all" ? undefined : establishmentId, professorId: professorId === "all" ? undefined : professorId, day: day === "all" ? undefined : day, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, pageSize: CATALOG_PAGE_SIZE }), [search, status, page, userId, activityId, scheduleId, establishmentId, professorId, day, dateFrom, dateTo]);
  const { data, meta, loading, error, refresh } = useEnrollments(filters); const selected = data.find((item) => item.id === selectedId) ?? data[0] ?? null; const filteredSchedules = activityId === "all" ? schedules : schedules.filter((item) => item.activity.id === activityId);
  useEffect(() => onLoadingChange?.(loading), [loading, onLoadingChange]);
  useEffect(() => { if (!loading) setInitialized(true); }, [loading]);
  if (!initialized && loading) {
    return embedded ? null : <CatalogLoadingState label="inscripciones" fullPage />;
  }
  async function change(value: EnrollmentStatus, reason?: string) { if (!selected) return; const reactivating = selected.status === "BAJA" && value === "CONFIRMADA"; try { await changeEnrollmentStatusClient(selected.id, value, value === "RECHAZADA" ? { motivoRechazo: reason } : ["CANCELADA", "BAJA"].includes(value) || reactivating ? { motivoCancelacion: reason } : {}); toast.success(reactivating ? "Inscripción reactivada y ciudadano notificado." : "Estado actualizado."); await refresh(); } catch (error: any) { toast.error(error?.response?.data?.message ?? "No pudimos actualizar el estado."); throw error; } }
  const sections = [
    { id: "status", title: "Estado", value: status, options: statusOptions.map(([value, label]) => ({ value, label })), onChange: (value: string) => { setStatus(value); setPage(1); } },
    { id: "dates", title: "Fechas", value: dateFrom || dateTo ? "custom" : "all", active: Boolean(dateFrom || dateTo), options: undefined, onChange: () => undefined, onClear: () => { setDateFrom(""); setDateTo(""); setPage(1); }, content: <div className="grid gap-3"><label className="space-y-1.5"><span className="text-sm font-bold text-[var(--brand-ink)]">Desde</span><Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} className={adminControlClass} /></label><label className="space-y-1.5"><span className="text-sm font-bold text-[var(--brand-ink)]">Hasta</span><Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} className={adminControlClass} /></label></div> },
    { id: "activity", title: "Actividad", value: activityId, options: options(schedules.map((x) => [x.activity.id, x.activity.name]), "Todas"), onChange: (value: string) => { setActivityId(value); setScheduleId("all"); setPage(1); } },
    { id: "schedule", title: "Horario", value: scheduleId, options: options(filteredSchedules.map((x) => [x.id, `${x.activity.name} · ${x.day} ${x.startTime} · ${x.establishment.name}`]), "Todos"), onChange: (value: string) => { setScheduleId(value); setPage(1); } },
    { id: "establishment", title: "Establecimiento", value: establishmentId, options: options(schedules.map((x) => [x.establishment.id, x.establishment.name]), "Todos"), onChange: (value: string) => { setEstablishmentId(value); setPage(1); } },
    { id: "professor", title: "Profesor", value: professorId, options: options(schedules.flatMap((x) => x.professors.map((p) => [p.id, p.fullName] as [string, string])), "Todos"), onChange: (value: string) => { setProfessorId(value); setPage(1); } },
    { id: "day", title: "Día", value: day, options: dayOptions.map(([value, label]) => ({ value, label })), onChange: (value: string) => { setDay(value); setPage(1); } },
  ];

  if (embedded) {
    return (
      <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(300px,.9fr)_minmax(380px,1.1fr)]">
        <section className={selectedId ? "hidden space-y-4 lg:block" : "space-y-4"}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <CatalogSearchInput
              value={search}
              onChange={(value) => { setSearch(value); setPage(1); }}
              placeholder="Buscar actividad o establecimiento..."
            />
            <CatalogFilterPopover sections={sections} />
          </div>
          <div className="grid gap-3">
            {data.map((item) => (
              <AdminListCard
                key={item.id}
                selected={selected?.id === item.id}
                onClick={() => setSelectedId(item.id)}
                leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white"><CalendarClock className="size-6" /></span>}
                title={item.activitySchedule.activity.name}
                badges={<Status value={item.status} />}
                description={formatEnrollmentScheduleSummary(item)}
                meta={`${item.activitySchedule.establishment.name} · ${formatCatalogDate(item.enrollmentDate)}`}
                trailing={<ChevronRight />}
              />
            ))}
          </div>
          {error ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4">No pudimos cargar las inscripciones.</p> : null}
          {!error && data.length === 0 ? <CatalogEmptyState title="El ciudadano no tiene inscripciones." description="Las inscripciones del ciudadano aparecerán en este listado." filtered={Boolean(search || status !== "all" || activityId !== "all" || scheduleId !== "all" || establishmentId !== "all" || professorId !== "all" || day !== "all" || dateFrom || dateTo)} /> : null}
          <CatalogPagination page={page} total={meta.total} onPageChange={setPage} />
        </section>

        <AdminDetailPanel onBack={() => setSelectedId("")} empty="Seleccioná una inscripción.">
          {selected ? <>
            <AdminDetailHeader
              title={selected.activitySchedule.activity.name}
              leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white"><CalendarClock className="size-8" /></span>}
              badge={<Status value={selected.status} />}
            />
            <dl className="mt-6 grid gap-3">
              <CatalogDetailField icon={CalendarClock} label="Días y horarios">{formatEnrollmentScheduleSummary(selected)}</CatalogDetailField>
              <CatalogDetailField icon={CalendarClock} label="Establecimiento">{selected.activitySchedule.establishment.name}</CatalogDetailField>
              <CatalogDetailField icon={CalendarClock} label="Fecha de inscripción">{formatCatalogDate(selected.enrollmentDate)}</CatalogDetailField>
              <CatalogDetailField icon={CheckSquare} label="Documentación">{selected.documentation.status === "COMPLETA" ? "Documentación obligatoria completa" : selected.documentation.missingRequirementNames?.length ? `Falta presentar: ${selected.documentation.missingRequirementNames.join(", ")}` : DOCUMENTATION_STATUS[selected.documentation.status].description}</CatalogDetailField>
              <CatalogDetailField icon={Users} label="Cupos">{selected.capacity.confirmedCount} confirmadas de {selected.capacity.totalCapacity} · {selected.capacity.availableCount} disponibles</CatalogDetailField>
              <CatalogDetailField icon={CalendarClock} label="Observaciones">{selected.observations || selected.rejectionReason || selected.cancellationReason || "Sin observaciones"}</CatalogDetailField>
            </dl>
          </> : null}
        </AdminDetailPanel>
      </div>
    );
  }

  const filtered = Boolean(search || status !== "all" || activityId !== "all" || scheduleId !== "all" || establishmentId !== "all" || professorId !== "all" || day !== "all" || dateFrom || dateTo);
  return <AdminPageShell>
    <CatalogPageHeader icon={ClipboardCheck} title="Inscripciones" description="Administrá cupos, confirmaciones y listas de espera de las actividades." total={meta.total} createLabel="Nueva inscripción" canCreate={canCreate} onCreate={() => router.push(`${basePath}/new`)} />
    <AdminSplitLayout list={<AdminListPane detailOpen={Boolean(selectedId)}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><CatalogSearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Buscar ciudadano, actividad o establecimiento..." /><CatalogFilterPopover sections={sections} /></div>
      {loading ? <div className="grid min-h-64 place-items-center"><CatalogLoadingState label="inscripciones" /></div> : error ? <CatalogEmptyState title="No pudimos cargar las inscripciones." description="Reintentá nuevamente en unos instantes." filtered={false} /> : data.length === 0 ? <CatalogEmptyState title="No se encontraron inscripciones." description="Las inscripciones creadas aparecerán en este listado." filtered={filtered} /> : <div className="flex min-h-0 flex-col gap-3"><div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">{data.map((item) => <AdminListCard key={item.id} onClick={() => setSelectedId(item.id)} selected={selected?.id === item.id} leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm"><UserRound className="size-6" /></span>} title={[item.user.firstName, item.user.lastName].filter(Boolean).join(" ") || "Ciudadano sin nombre"} badges={<><Status value={item.status} />{canViewDocuments ? <DocumentationStatusBadge summary={item.documentation} compact /> : null}</>} description={`${item.activitySchedule.activity.name} · ${formatEnrollmentScheduleSummary(item)}`} meta={`DNI ${item.user.documentNumber || "sin registrar"} · ${item.activitySchedule.establishment.name}${item.waitlistPosition ? ` · Posición ${item.waitlistPosition}` : ""}`} trailing={<ChevronRight className="size-5" />} />)}</div><CatalogPagination page={page} total={meta.total} onPageChange={setPage} /></div>}
    </AdminListPane>} detail={<div className={!selectedId ? "hidden lg:block" : undefined}><Detail item={selected} canEdit={canEdit} canViewDocuments={canViewDocuments} canState={canDelete || canAssign} onBack={() => setSelectedId(null)} onEdit={() => selected && router.push(`${basePath}/${selected.id}/edit`)} onChange={change} /></div>} />
  </AdminPageShell>;
}
const enrollmentDayOrder=["LUNES","MARTES","MIERCOLES","JUEVES","VIERNES","SABADO","DOMINGO"];
const enrollmentDayLabels:Record<string,string>={LUNES:"Lun",MARTES:"Mar",MIERCOLES:"Mié",JUEVES:"Jue",VIERNES:"Vie",SABADO:"Sáb",DOMINGO:"Dom"};
function formatEnrollmentScheduleSummary(item:Enrollment){const schedules=item.selectedSchedules.length?item.selectedSchedules:[item.activitySchedule];const groups=new Map<string,string[]>();schedules.slice().sort((a,b)=>enrollmentDayOrder.indexOf(a.day)-enrollmentDayOrder.indexOf(b.day)||a.startTime.localeCompare(b.startTime)).forEach(schedule=>{const time=schedule.startTime===schedule.endTime?schedule.startTime:`${schedule.startTime} a ${schedule.endTime}`;groups.set(time,[...(groups.get(time)??[]),enrollmentDayLabels[schedule.day]??schedule.day]);});return[...groups.entries()].map(([time,days])=>`${days.join(", ")} · ${time}`).join(" | ");}
function Detail({ item, canEdit, canViewDocuments, canState, onBack, onEdit, onChange }: { item: Enrollment | null; canEdit: boolean; canViewDocuments: boolean; canState: boolean; onBack: () => void; onEdit: () => void; onChange: (value: EnrollmentStatus, reason?: string) => Promise<void> }) {
  const [action, setAction] = useState<EnrollmentStatus | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  if (!item) return <AdminDetailPanel empty="Seleccioná una inscripción para consultar su detalle." />;
  const reactivating = item.status === "BAJA" && action === "CONFIRMADA";
  const requiresReason = action === "RECHAZADA" || action === "CANCELADA" || action === "BAJA" || reactivating;
  const close = () => { if (!saving) { setAction(null); setReason(""); } };
  async function confirm() { if (!action) return; setSaving(true); try { await onChange(action, reason.trim() || undefined); setAction(null); setReason(""); } finally { setSaving(false); } }
  return <><AdminDetailPanel onBack={onBack}>
    <AdminDetailHeader title={[item.user.firstName, item.user.lastName].filter(Boolean).join(" ") || "Ciudadano sin nombre"} subtitle={`${item.activitySchedule.activity.name} · ${formatEnrollmentScheduleSummary(item)}`} leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm"><UserRound className="size-8" /></span>} badge={<Status value={item.status} />} />
    <dl className="mt-6 grid gap-3"><CatalogDetailField icon={UserRound} label="DNI">{item.user.documentNumber || "Sin registrar"}</CatalogDetailField><CatalogDetailField icon={Mail} label="Email">{item.user.email}</CatalogDetailField><CatalogDetailField icon={CalendarClock} label="Actividad y horarios">{item.activitySchedule.activity.name} · {formatEnrollmentScheduleSummary(item)}</CatalogDetailField><CatalogDetailField icon={Building2} label="Establecimiento">{item.activitySchedule.establishment.name}</CatalogDetailField><CatalogDetailField icon={Users} label="Cupos">{item.capacity.confirmedCount} confirmadas de {item.capacity.totalCapacity} · {item.capacity.availableCount} disponibles · {item.capacity.waitlistCount} en espera</CatalogDetailField><CatalogDetailField icon={CalendarClock} label="Fecha de inscripción">{formatCatalogDate(item.enrollmentDate)}</CatalogDetailField><CatalogDetailField icon={CalendarClock} label="Fecha de confirmación">{item.confirmationDate ? formatCatalogDate(item.confirmationDate) : "Sin confirmar"}</CatalogDetailField><CatalogDetailField icon={CheckSquare} label="Observaciones y motivos">{item.observations || item.rejectionReason || item.cancellationReason || "Sin observaciones"}</CatalogDetailField></dl>
    {canViewDocuments ? <section className="mt-5 rounded-2xl border border-[var(--brand-border-soft)] bg-white/70 p-4"><p className="text-xs font-bold uppercase text-[var(--brand-muted)]">Documentación</p><div className="mt-2"><DocumentationStatusBadge summary={item.documentation} /></div><p className="mt-2 text-sm text-[var(--brand-text)]">{DOCUMENTATION_STATUS[item.documentation.status].description}</p><p className="mt-2 text-xs text-[var(--brand-muted)]">{item.documentation.requiredCount} requisitos obligatorios · {item.documentation.approvedCount} aprobados · {item.documentation.pendingReviewCount} pendientes · {item.documentation.rejectedCount} rechazados</p></section> : null}
    {canEdit || canState ? <AdminDetailActions>{canEdit ? <Button onClick={onEdit} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"><Edit3 />Editar</Button> : null}{canState && ["PENDIENTE", "LISTA_ESPERA", "CANCELADA", "BAJA"].includes(item.status) ? <Button onClick={() => setAction("CONFIRMADA")} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">{item.status === "BAJA" ? "Reactivar inscripción" : "Confirmar"}</Button> : null}{canState && ["PENDIENTE", "CANCELADA", "BAJA"].includes(item.status) ? <Button variant="outline" onClick={() => setAction("LISTA_ESPERA")}>Lista de espera</Button> : null}{canState && item.status === "RECHAZADA" ? <Button variant="outline" onClick={() => setAction("PENDIENTE")}>Volver a pendiente</Button> : null}{canState && item.status === "PENDIENTE" ? <Button variant="outline" className="text-red-700 hover:bg-red-50" onClick={() => setAction("RECHAZADA")}><XCircle />Rechazar</Button> : null}{canState && item.status === "CONFIRMADA" ? <Button variant="outline" onClick={() => setAction("BAJA")}>Dar de baja</Button> : null}{canState && !["CANCELADA", "BAJA", "RECHAZADA"].includes(item.status) ? <Button variant="outline" className="text-red-700 hover:bg-red-50" onClick={() => setAction("CANCELADA")}><XCircle />Cancelar</Button> : null}</AdminDetailActions> : null}
  </AdminDetailPanel><ConfirmDialog open={Boolean(action)} title={`${action ? enrollmentStatusLabel(action) : "Actualizar"} inscripción`} description="Confirmá el cambio de estado de la inscripción." confirmLabel="Confirmar cambio" cancelLabel="Volver" loading={saving} confirmDisabled={requiresReason && reason.trim().length < 3} icon={<ClipboardCheck />} onClose={close} onConfirm={() => void confirm()}>{requiresReason ? <div className="space-y-2"><Label className="font-bold text-[var(--brand-ink)]">Motivo *</Label><Textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-28 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)]" placeholder="Indicá el motivo del cambio de estado." /></div> : null}</ConfirmDialog></>;
}
function Status({ value }: { value: EnrollmentStatus }) {
  const styles: Record<EnrollmentStatus, string> = { PENDIENTE: "border-amber-300 bg-amber-50 text-amber-800", CONFIRMADA: "border-[#819B56]/40 bg-[#DDEED2] text-[#1D4F36]", LISTA_ESPERA: "border-sky-300 bg-sky-50 text-sky-800", CANCELADA: "border-red-300 bg-red-50 text-red-800", RECHAZADA: "border-red-300 bg-red-50 text-red-800", BAJA: "border-[#B2B2B2] bg-[#B2B2B2]/15 text-[#555]" };
  return <Badge variant="outline" className={styles[value]}>{enrollmentStatusLabel(value)}</Badge>;
}
