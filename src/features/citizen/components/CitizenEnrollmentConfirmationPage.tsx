"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck2, CheckCircle2, ChevronLeft, Clock3, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { AdminFormCard } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CatalogErrorState, CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { formatActividadLevel } from "@/features/actividades/helpers/actividad-display";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { citizenPost } from "../services/citizen.service";
import { useCitizenData } from "./CitizenPrimitives";

type Requirement = { id: string; type: "INFORMACION" | "DOCUMENTO" | "CONSENTIMIENTO" | "ELEMENTO_PERSONAL" | "CONDICION"; mandatory: boolean };
type Schedule = { id: string; day: string; startTime: string; endTime: string; slotDurationMinutes: number | null; slotGapMinutes: number; establishment: { name: string } | null };
type Activity = { id: string; name: string; imageUrl: string | null; category: string; free: boolean; price: number | null; level: "INICIAL" | "INTERMEDIO" | "AVANZADO" | null; enrollmentMode: "PERMANENTE" | "POR_PERIODO" | "POR_CLASE"; modalidadOperacion: string; eventSessions: Array<{id:string;date:string;horaInicio:string;horaFin:string}>; requirements: Requirement[]; requiresDocumentation: boolean; schedules: Schedule[] };
type Choice = { schedule: Schedule; startTime: string; endTime: string };
type EnrollmentResult = { status: "PENDIENTE" | "CONFIRMADA" | "LISTA_ESPERA" };

const dayLabels: Record<string, string> = { LUNES: "Lunes", MARTES: "Martes", MIERCOLES: "Miércoles", JUEVES: "Jueves", VIERNES: "Viernes", SABADO: "Sábado", DOMINGO: "Domingo" };

export function CitizenEnrollmentConfirmationPage({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error, retry } = useCitizenData<Activity>(`/activities/${id}`);
  const [levelConsent, setLevelConsent] = useState(false);
  const [requirementsConsent, setRequirementsConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestedSlots = useMemo(() => [...new Set(searchParams.getAll("slot").map(normalizeRequestedSlot).filter((slot): slot is string => Boolean(slot)))], [searchParams]);
  const requestedClassId = searchParams.get("classId");
  const choices = useMemo(() => {
    if (!data) return [];
    const requested = new Set(requestedSlots);
    return data.schedules.flatMap(buildScheduleChoices).filter((choice) => requested.has(slotKey(choice)));
  }, [data, requestedSlots]);
  const eventSession = useMemo(() => {
    if (data?.modalidadOperacion !== "EVENTO_UNICO") return null;
    if (requestedClassId) return data.eventSessions.find((session) => session.id === requestedClassId) ?? null;
    if (choices.length !== 1) return null;
    const choice = choices[0];
    return data.eventSessions.find((session) =>
      normalizeTime(session.horaInicio) === normalizeTime(choice.startTime)
      && normalizeTime(session.horaFin) === normalizeTime(choice.endTime)
      && dayFromDate(session.date) === choice.schedule.day
    ) ?? data.eventSessions.find((session) =>
      normalizeTime(session.horaInicio) === normalizeTime(choice.startTime)
      && normalizeTime(session.horaFin) === normalizeTime(choice.endTime)
    ) ?? null;
  }, [choices, data, requestedClassId]);
  const validSelection = data?.modalidadOperacion === "EVENTO_UNICO" ? Boolean(eventSession) : requestedSlots.length > 0 && choices.length === requestedSlots.length;
  const needsRequirementsConsent = Boolean(data?.requirements.some((item) => item.mandatory && ["ELEMENTO_PERSONAL", "CONDICION"].includes(item.type)));
  const canSubmit = validSelection && levelConsent && (!needsRequirementsConsent || requirementsConsent) && !saving;

  async function submit() {
    if (!data || !canSubmit) return;
    setSaving(true);
    try {
      const result = await citizenPost<EnrollmentResult>("/enrollments", {
        activityId: data.id,
        classId: eventSession?.id,
        selectedSlots: eventSession ? undefined : choices.map((choice) => ({ activityScheduleId: choice.schedule.id, startTime: normalizeTime(choice.startTime), endTime: normalizeTime(choice.endTime) })),
        nivelConsentido: true,
      });
      if (result.status === "PENDIENTE") toast.success("La inscripción quedó pendiente hasta completar la documentación obligatoria.");
      else if (result.status === "LISTA_ESPERA") toast.success("Te incorporamos a la lista de espera.");
      else if (data.enrollmentMode === "POR_CLASE") toast.success("La inscripción quedó habilitada. Ya podés reservar tus próximas clases.");
      else toast.success("La inscripción fue confirmada.");
      router.replace("/citizen/enrollments");
    } catch (caught) {
      toast.error(getAxiosMessage(caught, "No pudimos completar la inscripción."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <CatalogLoadingState label="confirmación de inscripción" fullPage />;
  if (error || !data) return <CatalogErrorState message="No pudimos cargar la confirmación de la inscripción." onRetry={retry} />;
  if (!validSelection) return <CatalogErrorState message={data.modalidadOperacion === "EVENTO_UNICO" && data.eventSessions.length === 0 ? "Esta actividad está configurada como evento único, pero todavía no tiene una fecha futura programada." : "Los horarios seleccionados no son válidos. Volvé a la actividad y elegilos nuevamente."} onRetry={() => router.replace(`/citizen/activities/${id}`)} />;

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] pb-[calc(var(--citizen-mobile-nav-h)+92px)] lg:p-8 lg:pb-8">
      <MobileConfirmation activity={data} choices={choices} eventSession={eventSession} needsRequirementsConsent={needsRequirementsConsent} requirementsConsent={requirementsConsent} setRequirementsConsent={setRequirementsConsent} levelConsent={levelConsent} setLevelConsent={setLevelConsent} canSubmit={canSubmit} saving={saving} onBack={() => router.back()} onSubmit={() => void submit()} />
      <div className="hidden lg:block">
      <AdminFormHeader icon={CalendarCheck2} title="Confirmar inscripción" description="Revisá los horarios elegidos y confirmá la información antes de finalizar." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <AdminFormCard title="Horarios seleccionados" description={`Actividad: ${data.name}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {eventSession ? <article className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-page)] p-4"><div className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><Clock3 className="size-5 text-[var(--brand-secondary)]" />{eventSession.date} · {eventSession.horaInicio} a {eventSession.horaFin}</div></article> : choices.map((choice) => (
              <article key={slotKey(choice)} className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-page)] p-4">
                <div className="flex items-center gap-2 font-extrabold text-[var(--brand-primary)]"><Clock3 className="size-5 text-[var(--brand-secondary)]" />{dayLabels[choice.schedule.day] ?? choice.schedule.day} · {choice.startTime} a {choice.endTime}</div>
                <p className="mt-2 flex items-center gap-2 text-sm text-[var(--brand-muted)]"><MapPin className="size-4" />{choice.schedule.establishment?.name || "Sin establecimiento asignado"}</p>
              </article>
            ))}
          </div>
          {data.requiresDocumentation ? <p className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900">Sin toda la documentación obligatoria aprobada, la inscripción quedará pendiente.</p> : null}
        </AdminFormCard>

        <AdminFormCard title="Confirmaciones" description="Leé y aceptá las condiciones para continuar." footer={<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => router.push(`/citizen/activities/${id}`)}>Volver</Button><Button type="button" disabled={!canSubmit} className="bg-[var(--brand-primary)] font-bold hover:bg-[#143A27]" onClick={() => void submit()}>{saving ? <><Loader2 className="animate-spin" />Confirmando...</> : <><CheckCircle2 />Confirmar inscripción</>}</Button></div>}>
          <div className="rounded-2xl border border-[var(--brand-border)] bg-[#EEF6E9] p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--brand-secondary)]">Nivel de la actividad</p>
            <p className="mt-1 text-xl font-extrabold text-[var(--brand-primary)]">{formatActividadLevel(data.level)}</p>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">Este nivel es informativo y quedará registrado con tu consentimiento.</p>
          </div>
          <div className="mt-5 space-y-4">
            {needsRequirementsConsent ? <Consent checked={requirementsConsent} onCheckedChange={setRequirementsConsent}>Confirmo que conozco los elementos y condiciones obligatorias para participar.</Consent> : null}
            <Consent checked={levelConsent} onCheckedChange={setLevelConsent}>Confirmo que fui informado sobre el nivel {formatActividadLevel(data.level)} de esta actividad.</Consent>
          </div>
        </AdminFormCard>
      </div>
      </div>
    </main>
  );
}

function MobileConfirmation({ activity, choices, eventSession, needsRequirementsConsent, requirementsConsent, setRequirementsConsent, levelConsent, setLevelConsent, canSubmit, saving, onBack, onSubmit }: { activity: Activity; choices: Choice[]; eventSession: Activity["eventSessions"][number] | null | undefined; needsRequirementsConsent: boolean; requirementsConsent: boolean; setRequirementsConsent: (value: boolean) => void; levelConsent: boolean; setLevelConsent: (value: boolean) => void; canSubmit: boolean; saving: boolean; onBack: () => void; onSubmit: () => void }) {
  return <div className="lg:hidden">
    <header className="flex min-h-16 items-center gap-3 bg-[var(--brand-primary)] px-4 py-3 text-white"><button type="button" onClick={onBack} aria-label="Volver" className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10"><ChevronLeft className="size-5" /></button><h1 className="min-w-0 flex-1 text-lg font-extrabold">Confirmar inscripción</h1><span className="rounded-full border border-[#9FC45B] px-2.5 py-1 text-[10px] font-bold">Paso 3 de 3</span></header>
    <div className="space-y-4 p-4">
      <section className="flex items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-3 shadow-sm"><ActivityImagePreview source={activity.imageUrl} alt={`Imagen de ${activity.name}`} className="size-20 shrink-0 rounded-xl" /><div className="min-w-0"><h2 className="text-xl font-extrabold text-[var(--brand-primary)]">{activity.name}</h2><p className="text-xs text-[var(--brand-muted)]">{activity.category}</p><div className="mt-2 flex flex-wrap gap-1.5"><MobileTag>{activity.free ? "Gratuita" : activity.price != null ? `$${activity.price}` : "Arancelada"}</MobileTag><MobileTag>{formatActividadLevel(activity.level)}</MobileTag></div></div></section>
      <section className="overflow-hidden rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] shadow-sm"><div className="flex items-center justify-between border-b border-[var(--brand-border-soft)] px-4 py-3"><h3 className="font-extrabold text-[var(--brand-primary)]">Horarios seleccionados</h3><span className="rounded-full bg-[var(--brand-secondary)] px-2 py-1 text-[10px] font-bold text-white">{eventSession ? 1 : choices.length} {eventSession || choices.length === 1 ? "turno" : "turnos"}</span></div><div className="divide-y divide-[var(--brand-border-soft)]">{eventSession ? <MobileSelectedSlot day={eventSession.date} time={`${eventSession.horaInicio} a ${eventSession.horaFin}`} establishment="Evento" /> : choices.map((choice) => <MobileSelectedSlot key={slotKey(choice)} day={dayLabels[choice.schedule.day] ?? choice.schedule.day} time={`${choice.startTime} a ${choice.endTime}`} establishment={choice.schedule.establishment?.name || "Sin establecimiento asignado"} />)}</div></section>
      <section className="rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-sm"><h3 className="font-extrabold text-[var(--brand-primary)]">Confirmaciones</h3><p className="mt-1 text-xs text-[var(--brand-muted)]">Revisá y aceptá las condiciones para finalizar.</p><div className="mt-3 space-y-2">{needsRequirementsConsent ? <Consent checked={requirementsConsent} onCheckedChange={setRequirementsConsent}>Confirmo que conozco los elementos y condiciones obligatorias para participar.</Consent> : null}<Consent checked={levelConsent} onCheckedChange={setLevelConsent}>Confirmo que fui informado sobre el nivel {formatActividadLevel(activity.level)}.</Consent></div></section>
      <section className="flex gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-[#EEF6E9] p-4"><ShieldCheck className="size-6 shrink-0 text-[var(--brand-primary)]" /><div><h3 className="text-sm font-extrabold text-[var(--brand-primary)]">Importante</h3><p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">{activity.requiresDocumentation ? "Podés inscribirte ahora, pero quedará pendiente hasta que se apruebe la documentación obligatoria." : "Tu lugar quedará reservado de acuerdo con la modalidad de inscripción de la actividad."}</p></div></section>
    </div>
    <div className="fixed inset-x-0 bottom-[var(--citizen-mobile-nav-h)] z-30 border-t border-[var(--brand-border-soft)] bg-[#F9FAF5]/95 p-3 backdrop-blur"><Button type="button" disabled={!canSubmit} onClick={onSubmit} className="h-12 w-full rounded-2xl bg-[var(--brand-primary)] text-sm font-extrabold hover:bg-[#143A27]">{saving ? <><Loader2 className="animate-spin" />Confirmando...</> : <>Confirmar inscripción<CheckCircle2 /></>}</Button></div>
  </div>;
}

function MobileTag({ children }: { children: ReactNode }) { return <span className="rounded-full bg-[#E5F0DE] px-2 py-1 text-[10px] font-bold text-[var(--brand-primary)]">{children}</span>; }

function MobileSelectedSlot({ day, time, establishment }: { day: string; time: string; establishment: string }) { return <article className="flex items-center gap-3 p-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] px-1 text-center text-[10px] font-extrabold leading-tight text-white">{day}</span><div className="min-w-0"><p className="font-extrabold text-[var(--brand-primary)]">{time}</p><p className="mt-1 flex items-center gap-1 truncate text-xs text-[var(--brand-muted)]"><MapPin className="size-3.5 shrink-0" />{establishment}</p></div></article>; }

function Consent({ checked, onCheckedChange, children }: { checked: boolean; onCheckedChange: (checked: boolean) => void; children: ReactNode }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--brand-border)] bg-white p-4 text-sm font-bold leading-relaxed text-[var(--brand-heading)]"><Checkbox className="mt-0.5" checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} /><span>{children}</span></label>;
}

function buildScheduleChoices(schedule: Schedule): Choice[] {
  if (!schedule.slotDurationMinutes) return [{ schedule, startTime: schedule.startTime, endTime: schedule.endTime }];
  const choices: Choice[] = [];
  const end = toMinutes(schedule.endTime);
  for (let cursor = toMinutes(schedule.startTime); cursor + schedule.slotDurationMinutes <= end; cursor += schedule.slotDurationMinutes + (schedule.slotGapMinutes || 0)) choices.push({ schedule, startTime: toTime(cursor), endTime: toTime(cursor + schedule.slotDurationMinutes) });
  return choices;
}

function slotKey(choice: Choice) { return `${choice.schedule.id}|${normalizeTime(choice.startTime)}|${normalizeTime(choice.endTime)}`; }
function normalizeRequestedSlot(value: string) {
  const [scheduleId, startTime, endTime, ...extra] = value.split("|");
  if (!scheduleId || !startTime || !endTime || extra.length) return null;
  return `${scheduleId}|${normalizeTime(startTime)}|${normalizeTime(endTime)}`;
}
function normalizeTime(value: string) { return value.trim().slice(0, 5); }
function dayFromDate(value: string) {
  const day = new Date(`${value.slice(0, 10)}T12:00:00`).getDay();
  return ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"][day];
}
function toMinutes(value: string) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function toTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
