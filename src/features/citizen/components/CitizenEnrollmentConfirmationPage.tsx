"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck2, CheckCircle2, Clock3, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { AdminFormCard } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CatalogErrorState, CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { formatActividadLevel } from "@/features/actividades/helpers/actividad-display";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { citizenPost } from "../services/citizen.service";
import { useCitizenData } from "./CitizenPrimitives";

type Requirement = { id: string; type: "INFORMACION" | "DOCUMENTO" | "CONSENTIMIENTO" | "ELEMENTO_PERSONAL" | "CONDICION"; mandatory: boolean };
type Schedule = { id: string; day: string; startTime: string; endTime: string; slotDurationMinutes: number | null; slotGapMinutes: number; establishment: { name: string } | null };
type Activity = { id: string; name: string; level: "INICIAL" | "INTERMEDIO" | "AVANZADO" | null; enrollmentMode: "PERMANENTE" | "POR_PERIODO" | "POR_CLASE"; requirements: Requirement[]; requiresDocumentation: boolean; schedules: Schedule[] };
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

  const requestedSlots = useMemo(() => [...new Set(searchParams.getAll("slot"))], [searchParams]);
  const choices = useMemo(() => {
    if (!data) return [];
    const requested = new Set(requestedSlots);
    return data.schedules.flatMap(buildScheduleChoices).filter((choice) => requested.has(slotKey(choice)));
  }, [data, requestedSlots]);
  const validSelection = requestedSlots.length > 0 && choices.length === requestedSlots.length;
  const needsRequirementsConsent = Boolean(data?.requirements.some((item) => item.mandatory && ["ELEMENTO_PERSONAL", "CONDICION"].includes(item.type)));
  const canSubmit = validSelection && levelConsent && (!needsRequirementsConsent || requirementsConsent) && !saving;

  async function submit() {
    if (!data || !canSubmit) return;
    setSaving(true);
    try {
      const result = await citizenPost<EnrollmentResult>("/enrollments", {
        activityId: data.id,
        selectedSlots: choices.map((choice) => ({ activityScheduleId: choice.schedule.id, startTime: choice.startTime, endTime: choice.endTime })),
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
  if (!validSelection) return <CatalogErrorState message="Los horarios seleccionados no son válidos. Volvé a la actividad y elegilos nuevamente." onRetry={() => router.replace(`/citizen/activities/${id}`)} />;

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <AdminFormHeader icon={CalendarCheck2} title="Confirmar inscripción" description="Revisá los horarios elegidos y confirmá la información antes de finalizar." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <AdminFormCard title="Horarios seleccionados" description={`Actividad: ${data.name}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            {choices.map((choice) => (
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
    </main>
  );
}

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

function slotKey(choice: Choice) { return `${choice.schedule.id}|${choice.startTime}|${choice.endTime}`; }
function toMinutes(value: string) { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function toTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
