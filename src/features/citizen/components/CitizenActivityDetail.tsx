"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Clock3,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { formatActividadLevel } from "@/features/actividades/helpers/actividad-display";
import {
  CatalogErrorState,
  CatalogLoadingState,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { citizenPost } from "../services/citizen.service";
import { CitizenCard, useCitizenData } from "./CitizenPrimitives";
import { CitizenMobileActivityEnrollment } from "./mobile/CitizenMobileActivityEnrollment";

type CitizenActivityRequirement = {
  id: string;
  name: string;
  imageUrl: string | null;
  type:
    | "INFORMACION"
    | "DOCUMENTO"
    | "CONSENTIMIENTO"
    | "ELEMENTO_PERSONAL"
    | "CONDICION";
  mandatory: boolean;
  requiresDocument: boolean;
  observations: string | null;
  instructions: string | null;
};
type CitizenActivitySchedule = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number | null;
  slotGapMinutes: number;
  space: string | null;
  establishment: { name: string } | null;
  professors: string[];
  availableCount: number;
  waitlistEnabled: boolean;
  ownEnrollmentStatus: string | null;
  ownEnrollmentId: string | null;
  ownEnrollmentSlots: Array<{
    startTime: string | null;
    endTime: string | null;
    status: string;
  }>;
};
export type CitizenActivityDetailData = {
  id: string;
  name: string;
  shortDescription: string | null;
  imageUrl: string | null;
  descripcion: string | null;
  category: string;
  level: "INICIAL" | "INTERMEDIO" | "AVANZADO" | null;
  enrollmentMode: "PERMANENTE" | "POR_PERIODO" | "POR_CLASE";
  modalidadOperacion: string;
  eventSessions: Array<{ id: string; date: string; horaInicio: string; horaFin: string; estado: string }>;
  periodMonths: number | null;
  free: boolean;
  price: string | null;
  requirements: CitizenActivityRequirement[];
  requiresDocumentation: boolean;
  schedules: CitizenActivitySchedule[];
};
export type EnrollmentChoice = {
  schedule: CitizenActivitySchedule;
  startTime: string;
  endTime: string;
};

const dayOrder = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
];
const dayLabels: Record<string, { short: string; label: string }> = {
  LUNES: { short: "Lun", label: "Lunes" },
  MARTES: { short: "Mar", label: "Martes" },
  MIERCOLES: { short: "Mié", label: "Miércoles" },
  JUEVES: { short: "Jue", label: "Jueves" },
  VIERNES: { short: "Vie", label: "Viernes" },
  SABADO: { short: "Sáb", label: "Sábado" },
  DOMINGO: { short: "Dom", label: "Domingo" },
};

export function CitizenActivityDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, loading, error, retry } =
    useCitizenData<CitizenActivityDetailData>(`/activities/${id}`);
  const [selectedChoices, setSelectedChoices] = useState<EnrollmentChoice[]>(
    [],
  );
  const [checkingChoiceKey, setCheckingChoiceKey] = useState<string | null>(
    null,
  );
  const [choiceConflict, setChoiceConflict] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [continuingEnrollment, setContinuingEnrollment] = useState(false);
  const [mobileStep, setMobileStep] = useState<1|2>(1);
  const eventSession = data?.modalidadOperacion === "EVENTO_UNICO" && data.eventSessions.length === 1 ? data.eventSessions[0] : null;

  async function toggleChoice(choice: EnrollmentChoice) {
    if (!data) return;
    const key = choiceKey(choice);
    const selected = selectedChoices.some((item) => choiceKey(item) === key);
    if (selected) {
      setSelectedChoices((current) =>
        current.filter((item) => choiceKey(item) !== key),
      );
      setChoiceConflict(null);
      return;
    }
    const next = [...selectedChoices, choice];
    setCheckingChoiceKey(key);
    setChoiceConflict(null);
    try {
      await citizenPost("/enrollments/availability", {
        activityId: data.id,
        selections: next.map((item) => ({
          activityScheduleId: item.schedule.id,
          startTime: item.startTime,
          endTime: item.endTime,
        })),
      });
      setSelectedChoices(next);
    } catch (caught) {
      const message = getAxiosMessage(
        caught,
        "Ya tenés otra actividad en ese día y horario.",
      );
      toast.error(message);
      setChoiceConflict({ key, message });
    } finally {
      setCheckingChoiceKey(null);
    }
  }

  if (loading) return <CatalogLoadingState label="actividad" fullPage />;
  if (error || !data)
    return (
      <CatalogErrorState
        message="No pudimos cargar la información de la actividad."
        onRetry={retry}
      />
    );

  function continueEnrollment() {
    setContinuingEnrollment(true);
    const params = new URLSearchParams();
    if (eventSession) params.set("classId", eventSession.id);
    selectedChoices.forEach((choice) => params.append("slot", `${choice.schedule.id}|${choice.startTime}|${choice.endTime}`));
    router.push(`/citizen/activities/${id}/enroll?${params.toString()}`);
  }

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[#F7FBF5] lg:p-8">
      <CitizenMobileActivityEnrollment data={data} step={mobileStep} selectedChoices={selectedChoices} checkingChoiceKey={checkingChoiceKey} choiceConflict={choiceConflict} continuing={continuingEnrollment} eventSession={eventSession} onStepChange={setMobileStep} onToggle={toggleChoice} onContinue={continueEnrollment} onEditExisting={(enrollmentId)=>router.push(`/citizen/enrollments/${enrollmentId}/schedule`)} onBack={()=>router.back()}/>
      <div className="hidden lg:block">
      <header className="flex items-start gap-4">
        <ActivityImagePreview
          source={data.imageUrl}
          alt={`Imagen de ${data.name}`}
          className="size-20 shrink-0 rounded-2xl sm:size-24"
        />
        <div className="min-w-0 pt-1">
          <h1 className="break-words text-3xl font-bold tracking-tight text-[#1D4F36] sm:text-4xl">
            {data.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#315644]/80 sm:text-base">
            {data.shortDescription || "Información y horarios disponibles."}
          </p>
        </div>
      </header>
      <div className="mt-6">
        <>
          <CitizenCard>
            <p>{data.descripcion}</p>
            <p className="mt-3 text-sm">
              {data.category} · {data.free ? "Gratuita" : `$${data.price}`} ·
              Nivel {formatActividadLevel(data.level)}
            </p>
            <p className="mt-3 rounded-xl bg-[#EEF6E9] p-3 text-sm font-bold text-[#1D4F36]">
              {data.enrollmentMode === "PERMANENTE"
                ? "La inscripción conserva tu lugar en este horario hasta que solicites la baja."
                : data.enrollmentMode === "POR_PERIODO"
                  ? `La inscripción tiene una vigencia de ${data.periodMonths ?? 1} ${data.periodMonths === 1 ? "mes" : "meses"}.`
                  : "La inscripción habilita el acceso; después reservás cada fecha o turno desde Próximas clases."}
            </p>
          </CitizenCard>
          <h2 className="mt-6 text-xl font-extrabold text-[#1D4F36]">
            Requisitos para inscribirte
          </h2>
          <CitizenCard>
            {data.requirements.length ? (
              <div className="grid gap-4">
                {data.requirements.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-[#DDE8D7] pb-3 last:border-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-[#1D4F36]">{item.name}</p>
                      <Badge variant="outline">
                        {item.mandatory ? "Obligatorio" : "Recomendado"}
                      </Badge>
                      {item.requiresDocument ? (
                        <Badge variant="secondary">Documento aprobado</Badge>
                      ) : null}
                      {item.type === "ELEMENTO_PERSONAL" ? (
                        <Badge className="bg-[#DDEBCF] text-[#1D4F36] hover:bg-[#DDEBCF]">
                          Debés llevarlo
                        </Badge>
                      ) : null}
                      {item.type === "CONDICION" ? (
                        <Badge variant="secondary">
                          Condición de participación
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[#5F6F68]">
                      {item.observations ||
                        item.instructions ||
                        "Sin instrucciones adicionales."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p>Esta actividad no tiene requisitos adicionales.</p>
            )}
            {data.requiresDocumentation ? (
              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Podés inscribirte aunque falte documentación, pero quedará
                pendiente y no podrás realizar la actividad hasta que todos los
                documentos obligatorios estén aprobados.
              </p>
            ) : null}
          </CitizenCard>
          <h2 className="mt-6 text-xl font-extrabold text-[#1D4F36]">
            Días y horarios disponibles
          </h2>
          <p className="mt-1 text-sm text-[#5F6F68]">
            Consultá los días de la actividad y elegí el horario en el que
            querés participar.
          </p>
          <div className="mt-4 rounded-2xl border border-[#C9D9C3] bg-[#EEF6E9] p-4">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#DDE8D7] text-[#1D4F36]">
                <CalendarClock className="size-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-[#1D4F36]">
                  Días de la actividad
                </h3>
                <p className="text-sm text-[#5F6F68]">
                  Los días habilitados se muestran destacados.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {dayOrder.map((day) => {
                const schedules = data.schedules.filter(
                  (schedule) => schedule.day === day,
                );
                const available = schedules.length > 0;
                const enrolled = schedules.some((schedule) =>
                  Boolean(schedule.ownEnrollmentStatus),
                );
                const selected = selectedChoices.some(
                  (choice) => choice.schedule.day === day,
                );
                const marked = enrolled || selected;
                return (
                  <div
                    key={day}
                    className={`grid min-h-20 place-items-center rounded-xl border text-center transition ${marked ? "border-[#1D4F36] bg-[#DDEF8F] shadow-sm ring-1 ring-[#819B56]" : available ? "border-[#819B56] bg-white" : "border-[#C9D9C3] bg-white/60 opacity-40"}`}
                  >
                    <span>
                      <strong className="flex items-center justify-center gap-1.5 text-[#1D4F36]">
                        {marked ? <Check className="size-4" /> : null}
                        {dayLabels[day].short}
                      </strong>
                      <small className="block font-bold uppercase text-[#5F6F68]">
                        {dayLabels[day].label}
                      </small>
                      {marked ? (
                        <small className="mt-1 block text-[10px] font-extrabold uppercase text-[#1D4F36]">
                          {enrolled ? "Inscripto" : "Seleccionado"}
                        </small>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            {dayOrder.map((day) => {
              const choices = data.schedules
                .filter((schedule) => schedule.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .flatMap(buildScheduleChoices);
              if (!choices.length) return null;
              return (
                <section
                  key={day}
                  className="rounded-2xl border border-[#DDE8D7] bg-white p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Clock3 className="size-5 text-[#819B56]" />
                    <h3 className="font-extrabold text-[#1D4F36]">
                      {dayLabels[day].label}
                    </h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {choices.map((choice) => {
                      const schedule = choice.schedule;
                      const enrolled = schedule.ownEnrollmentSlots.some(
                        (slot) =>
                          slot.startTime === choice.startTime &&
                          slot.endTime === choice.endTime,
                      );
                      const key = choiceKey(choice);
                      const checking = checkingChoiceKey === key;
                      const conflict = choiceConflict?.key === key;
                      const disabled =
                        Boolean(schedule.ownEnrollmentStatus) ||
                        (!schedule.availableCount &&
                          !schedule.waitlistEnabled) ||
                        checkingChoiceKey !== null;
                      const selected = selectedChoices.some(
                        (item) => choiceKey(item) === choiceKey(choice),
                      );
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-3 rounded-xl border p-3 transition ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${conflict ? "border-red-500 bg-red-50 ring-1 ring-red-200" : selected || enrolled ? "border-[#1D4F36] bg-[#EEF6E9]" : "border-[#DDE8D7] hover:border-[#819B56]"}`}
                        >
                          <Checkbox
                            checked={selected || enrolled}
                            disabled={disabled}
                            onCheckedChange={() => void toggleChoice(choice)}
                            className="mt-1"
                          />
                          <span className="min-w-0 flex-1">
                            <strong
                              className={`block ${conflict ? "text-red-800" : "text-[#1D4F36]"}`}
                            >
                              {choice.startTime} a {choice.endTime}
                            </strong>
                            <small className="mt-1 block text-[#5F6F68]">
                              {schedule.establishment?.name ||
                                "Sin establecimiento asignado"}
                            </small>
                            <small className="block text-[#5F6F68]">
                              {schedule.professors.join(", ") ||
                                "Sin profesor asignado"}
                            </small>
                            {checking ? (
                              <span className="mt-2 flex items-center gap-1.5 text-xs font-bold text-[#819B56]">
                                <Loader2 className="size-4 animate-spin" />
                                Verificando disponibilidad...
                              </span>
                            ) : conflict ? (
                              <span className="mt-2 flex items-start gap-1.5 text-xs font-bold leading-relaxed text-red-700">
                                <AlertCircle className="mt-px size-4 shrink-0" />
                                {choiceConflict.message}
                              </span>
                            ) : (
                              <span className="mt-2 block text-xs font-bold text-[#819B56]">
                                {enrolled
                                  ? "Ya estás inscripto en este horario"
                                  : schedule.ownEnrollmentStatus
                                    ? "Ya tenés una inscripción en este día"
                                    : selected
                                      ? "Horario seleccionado"
                                      : schedule.availableCount
                                        ? `${schedule.availableCount} lugares · Seleccionar`
                                        : schedule.waitlistEnabled
                                          ? "Sin cupo · Seleccionar espera"
                                          : "Sin cupo disponible"}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#C9D9C3] bg-[#EEF6E9] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-[#1D4F36]">
                {eventSession
                  ? `${eventSession.date} · ${eventSession.horaInicio} a ${eventSession.horaFin}`
                  : selectedChoices.length
                  ? `${selectedChoices.length} ${selectedChoices.length === 1 ? "horario seleccionado" : "horarios seleccionados"}`
                  : "Seleccioná uno o más horarios"}
              </p>
              <p className="mt-1 text-sm text-[#5F6F68]">
                {data.modalidadOperacion === "EVENTO_UNICO" ? eventSession ? "Esta es la única fecha disponible del evento." : "El evento no tiene una fecha u horario válido para inscripciones." : "Podés combinar días y turnos antes de confirmar la inscripción."}
              </p>
            </div>
            <Button
              type="button"
              disabled={data.modalidadOperacion === "EVENTO_UNICO" ? !eventSession || continuingEnrollment : !selectedChoices.length || continuingEnrollment}
              className="h-11 bg-[#1D4F36] font-bold hover:bg-[#143A27]"
              onClick={continueEnrollment}
            >
              {continuingEnrollment ? (
                <><Loader2 className="animate-spin" />Inscribiendo...</>
              ) : (
                "Continuar inscripción"
              )}
            </Button>
          </div>
        </>
      </div>
      </div>
    </main>
  );
}

function buildScheduleChoices(
  schedule: CitizenActivitySchedule,
): EnrollmentChoice[] {
  const duration = schedule.slotDurationMinutes;
  if (!duration)
    return [
      { schedule, startTime: schedule.startTime, endTime: schedule.endTime },
    ];
  const gap = schedule.slotGapMinutes || 0;
  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);
  const choices: EnrollmentChoice[] = [];
  for (let cursor = start; cursor + duration <= end; cursor += duration + gap)
    choices.push({
      schedule,
      startTime: toTime(cursor),
      endTime: toTime(cursor + duration),
    });
  return choices;
}

function choiceKey(choice: EnrollmentChoice) {
  return `${choice.schedule.id}-${choice.startTime}-${choice.endTime}`;
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}
function toTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
