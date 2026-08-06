/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, DoorOpen, Loader2, RotateCcw, Save, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CatalogLoadingState, CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { updateTeacherAttendanceClient } from "@/features/teacher/services/teacher.service";
import { useCan } from "@/hooks/useCan";
import { useAttendanceRoster } from "../hooks/useAttendance";
import { closeAttendanceClient, markAttendanceBatchClient, reopenAttendanceClient } from "../services/attendance.service";
import type { AttendanceRoster, AttendanceRosterItem, AttendanceStatus } from "../types/attendance.types";

const localToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function AttendanceRosterPage({ sessionId, workspace = "administration" }: { sessionId: string; workspace?: "administration" | "teacher" }) {
  const nextRouter = useRouter();
  const router = { push: (href: string) => nextRouter.push(workspace === "teacher" && href === "/attendance" ? "/teacher/attendance" : href) };
  const canCreate = useCan("attendance", "crear"), canEdit = useCan("attendance", "editar"), canBatch = useCan("attendance", "asignar"), canReopen = useCan("attendance", "eliminar");
  const { data, setData, loading, error } = useAttendanceRoster(sessionId, workspace);
  const [query, setQuery] = useState(""), [draft, setDraft] = useState<Record<string, AttendanceRosterItem>>({}), [correctionReason, setCorrectionReason] = useState(""), [confirmClose, setConfirmClose] = useState(false), [saving, setSaving] = useState(false);
  const dirty = Object.keys(draft).length > 0;
  const closed = data?.session.attendanceState === "CLOSED" || Boolean(data && ["SUSPENDIDA", "CANCELADA", "FINALIZADA"].includes(data.session.status));
  const historical = Boolean(data && data.session.date < localToday());
  const unregisteredCount = data?.attendees.filter((row) => !(draft[row.enrollmentId]?.status ?? row.status)).length ?? 0;
  const rows = useMemo(() => data?.attendees.map((row) => draft[row.enrollmentId] ?? row).filter((row) => `${row.user.firstName} ${row.user.lastName} ${row.user.documentNumber}`.toLowerCase().includes(query.toLowerCase())) ?? [], [data, draft, query]);

  useEffect(() => { if (!dirty) return; const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
  if (loading) return <CatalogLoadingState label="planilla de asistencia" fullPage />;
  if (error || !data) return <main className="p-8">No pudimos cargar la planilla. <Button onClick={() => router.push("/attendance")}>Volver</Button></main>;

  const patch = (row: AttendanceRosterItem, changes: Partial<AttendanceRosterItem>) => setDraft((current) => ({ ...current, [row.enrollmentId]: { ...row, ...current[row.enrollmentId], ...changes } }));
  const applyRoster = (next: AttendanceRoster) => { setData(next); setDraft({}); setCorrectionReason(""); };
  async function save() {
    if (!dirty) return true;
    if (historical && !correctionReason.trim()) { toast.error("Indicá el motivo de la corrección histórica."); return false; }
    const records = Object.values(draft).map((row) => ({ enrollmentId: row.enrollmentId, status: row.status!, justificationReason: row.status === "JUSTIFICADA" ? row.justificationReason : null, observations: row.observations }));
    if (records.some((row) => row.status === "JUSTIFICADA" && !row.justificationReason?.trim())) { toast.error("Indicá el motivo de cada ausencia justificada."); return false; }
    setSaving(true);
    try { applyRoster(workspace === "teacher" ? await updateTeacherAttendanceClient(sessionId, { action: "batch", records }) : await markAttendanceBatchClient({ activitySessionId: sessionId, records, correctionReason: historical ? correctionReason.trim() : undefined })); toast.success("Asistencia guardada."); return true; }
    catch (requestError: any) { toast.error(requestError?.response?.data?.message ?? "No pudimos guardar la asistencia."); return false; }
    finally { setSaving(false); }
  }
  async function close() { if (dirty && !(await save())) return; setSaving(true); try { applyRoster(workspace === "teacher" ? await updateTeacherAttendanceClient(sessionId, { action: "close" }) : await closeAttendanceClient(sessionId)); setConfirmClose(false); toast.success("Planilla cerrada."); } catch (requestError: any) { toast.error(requestError?.response?.data?.message ?? "No pudimos cerrar la planilla."); } finally { setSaving(false); } }
  async function reopen() { const reason = window.prompt("Indicá el motivo para reabrir la planilla:")?.trim(); if (!reason) return; setSaving(true); try { applyRoster(await reopenAttendanceClient(sessionId, reason)); toast.success("Planilla reabierta."); } catch (requestError: any) { toast.error(requestError?.response?.data?.message ?? "No pudimos reabrir la planilla."); } finally { setSaving(false); } }

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
    <div className="flex justify-end"><Button variant="outline" className="rounded-xl border-[var(--brand-border)] bg-white" onClick={() => router.push("/attendance")}>← Volver</Button></div>
    <header className="mt-3 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-[var(--brand-secondary)]">Planilla de asistencia</p><h1 className="mt-1 text-3xl font-extrabold text-[var(--brand-primary)]">{data.session.activity.name}</h1><p className="mt-2 text-sm text-[var(--brand-muted)]">{data.session.date} · {data.session.startTime} a {data.session.endTime} · {data.session.establishment.name}{data.session.space ? ` · ${data.session.space}` : ""}</p></div>{closed ? <span className="rounded-full bg-[var(--brand-highlight)] px-3 py-1 text-xs font-bold text-[var(--brand-primary)]">Cerrada por {data.session.attendanceClosedBy ?? "Administración"}</span> : null}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5"><Stat label="Inscriptos" value={data.summary.eligibleCount}/><Stat label="Presentes" value={data.summary.presentCount}/><Stat label="Ausentes" value={data.summary.absentCount}/><Stat label="Justificadas" value={data.summary.justifiedCount}/><Stat label="Ingresaron y faltaron" value={data.summary.enteredButAbsentCount}/></div>
    </header>
    <section className="mt-5 rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5">
      <div className="grid gap-3 xl:grid-cols-[1fr_auto]"><CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, apellido o DNI..."/><div className="flex flex-wrap gap-2">{!closed && canBatch ? <><Button variant="outline" className="h-12 rounded-xl border-[var(--brand-border)] bg-white" onClick={() => data.attendees.forEach((row) => patch(row, { status: "PRESENTE", justificationReason: null }))}>Todos presentes</Button><Button disabled={!dirty || saving} className="h-12 rounded-xl bg-[var(--brand-primary)]" onClick={() => void save()}>{saving ? <Loader2 className="animate-spin"/> : <Save/>}Guardar</Button><Button variant="outline" className="h-12 rounded-xl border-[var(--brand-border)] bg-white" onClick={() => setConfirmClose(true)}><CheckCircle2/>Cerrar planilla</Button></> : closed && canReopen ? <Button variant="outline" className="h-12 rounded-xl border-[var(--brand-border)] bg-white" disabled={saving} onClick={() => void reopen()}><RotateCcw/>Reabrir</Button> : null}</div></div>
      {historical && dirty ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><Label className="font-bold text-amber-900">Motivo de la corrección histórica *</Label><Textarea className="mt-2 bg-white" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Explicá por qué se modifica una asistencia anterior..."/></div> : null}
      <div className="mt-5 grid gap-3">{rows.map((row) => { const original = data.attendees.find((item) => item.enrollmentId === row.enrollmentId) ?? row, canChange = original.attendanceId ? canEdit : canCreate, enteredButAbsent = row.enteredEstablishment && row.status === "AUSENTE"; return <article key={row.enrollmentId} className="rounded-2xl border border-[var(--brand-border-soft)] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-extrabold text-[var(--brand-ink)]">{row.user.firstName} {row.user.lastName}</p><p className="text-sm text-[var(--brand-muted)]">DNI {row.user.documentNumber ?? "Sin informar"}</p><div className="mt-2 flex flex-wrap gap-2">{row.enteredEstablishment ? <Badge variant="outline" className="border-[var(--brand-secondary)]/50 bg-[var(--brand-highlight)] text-[var(--brand-primary)]"><DoorOpen/>Ingresó al establecimiento</Badge> : null}{enteredButAbsent ? <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">Falta injustificada en clase</Badge> : null}</div></div><div className="flex flex-wrap gap-2">{(["PRESENTE", "AUSENTE", "JUSTIFICADA"] as AttendanceStatus[]).map((status) => <Button key={status} disabled={closed || !canChange} variant={row.status === status ? "default" : "outline"} className={row.status === status ? "bg-[var(--brand-primary)]" : ""} onClick={() => patch(original, { status, justificationReason: status === "JUSTIFICADA" ? row.justificationReason : null })}>{status === "PRESENTE" ? <CheckCircle2/> : <XCircle/>}{status === "PRESENTE" ? "Presente" : status === "AUSENTE" ? "Ausente" : "Justificada"}</Button>)}</div></div>{row.status === "JUSTIFICADA" ? <Input disabled={closed || !canChange} className="mt-3 bg-[var(--brand-page)]" placeholder="Motivo obligatorio" value={row.justificationReason ?? ""} onChange={(event) => patch(original, { status: row.status, justificationReason: event.target.value })}/> : null}<Textarea disabled={closed || !canChange} className="mt-3 bg-[var(--brand-page)]" placeholder="Observaciones opcionales" value={row.observations ?? ""} onChange={(event) => patch(original, { observations: event.target.value })}/></article>; })}</div>
    </section>
    <ConfirmDialog open={confirmClose} title="Cerrar planilla" description={unregisteredCount ? `Hay ${unregisteredCount} ${unregisteredCount === 1 ? "participante" : "participantes"} sin registrar. Al cerrar la planilla ${unregisteredCount === 1 ? "quedará marcado" : "quedarán marcados"} como ausente${unregisteredCount === 1 ? "" : "s"}. ¿Querés continuar?` : "La planilla quedará cerrada. Luego solo administración podrá reabrirla. ¿Querés continuar?"} confirmLabel="Cerrar planilla" loading={saving} onConfirm={() => void close()} onClose={() => !saving && setConfirmClose(false)}/>
  </main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl bg-white p-3 text-center"><p className="text-2xl font-extrabold text-[var(--brand-primary)]">{value}</p><p className="text-xs font-bold text-[var(--brand-muted)]">{label}</p></div>; }
