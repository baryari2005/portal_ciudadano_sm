"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  FileCheck2,
  FileText,
  ImageIcon,
  Loader2,
  Repeat2,
  Save,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Label } from "@/components/ui/label";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useActivityCatalogs } from "@/features/actividades/hooks/useActivityCatalogs";
import { CheckCard } from "./CheckCard";
import { GeneralInformation } from "./GeneralInformation";
import { HorariosStep } from "./HorariosStep";
import { WorkflowSelectionBrowser } from "./WorkflowSelectionBrowser";
import { ReservationSettings } from "./ReservationSettings";
import {
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/components/shared/admin-patterns";
import { AdminWorkflowLayout } from "@/components/shared/admin-workflow-layout";
import { listActiveEstablecimientosClient } from "@/features/establecimientos/services/establecimientos.service";
import { listarProfesoresClient } from "@/features/profesores/services/profesores.service";
import { listRequirementsClient } from "@/features/requirements/services/requirements.service";
import { listResourcesClient } from "@/features/resources/services/resources.service";
import {
  discardDraftClient,
  getDraftClient,
  publishDraftClient,
} from "../services/activity-drafts.service";
import { useActivityDraftAutosave } from "../hooks/useActivityDraftAutosave";
import { useActivityDraftNavigation } from "../hooks/useActivityDraftNavigation";
import { draftFingerprint } from "../helpers/draft-persistence";
import { ActivityDraftLeaveDialog } from "./ActivityDraftLeaveDialog";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import type {
  ActivityDraft,
  ActivityDraftPayload,
  ActivityDraftPending,
} from "../types/activity-draft.types";
import type { Establecimiento } from "@/features/establecimientos/types/establecimiento.types";
import type { Profesor } from "@/features/profesores/types/profesor.types";
import type { Requirement } from "@/features/requirements/types/requirement.types";
import type { Resource } from "@/features/resources/types/resource.types";
import type { CategoriaActividad } from "@/features/categorias-actividades/types/categoria-actividad.types";
import type { PublicoObjetivo } from "@/features/publicos-objetivo/types/publico-objetivo.types";

type WorkflowOptions = {
  establishments: Establecimiento[];
  professors: Profesor[];
  requirements: Requirement[];
  resources: Resource[];
};
type WorkflowPublic = PublicoObjetivo & { genero?: string | null };

const stepIcons = [
  Repeat2,
  FileText,
  Building2,
  CalendarDays,
  UsersRound,
  FileCheck2,
  Clock3,
  ClipboardCheck,
] as const;

const steps = [
  "Modalidad",
  "Información",
  "Establecimiento",
  "Horarios",
  "Dirigido a",
  "Requisitos",
  "Reservas",
  "Revisión",
];
const modes = [
  [
    "HORARIO_FIJO",
    "Horario fijo",
    "La inscripción incluye todos los días y horarios.",
  ],
  [
    "TURNO_RECURRENTE",
    "Turno recurrente",
    "La persona elige qué turnos semanales conservar.",
  ],
  [
    "TURNO_PUNTUAL",
    "Turno puntual",
    "Cada fecha y franja se reserva por separado.",
  ],
  ["ACCESO_LIBRE", "Acceso libre", "Ingreso dentro del horario sin reserva."],
  ["EVENTO_UNICO", "Evento único", "Una fecha y horario concretos."],
  ["CURSO_PERIODO", "Curso con período", "Ciclo con inicio y finalización."],
] as const;
const modePresentation = {
  HORARIO_FIJO: {
    icon: CalendarRange,
    text: "Administración define un paquete indivisible de días y horarios. Al inscribirse, la persona ocupa un cupo en todo el cronograma.",
  },
  TURNO_RECURRENTE: {
    icon: Repeat2,
    text: "La actividad ofrece distintos turnos y la persona elige uno o más para repetirlos semanalmente y conservar esos cupos.",
  },
  TURNO_PUNTUAL: {
    icon: Clock3,
    text: "Cada fecha y franja disponible se reserva de manera independiente.",
  },
  ACCESO_LIBRE: {
    icon: UsersRound,
    text: "Se puede ingresar durante el horario habilitado sin reservar un cupo.",
  },
  EVENTO_UNICO: {
    icon: Sparkles,
    text: "Sucede una sola vez, en una fecha y horario concretos.",
  },
  CURSO_PERIODO: {
    icon: Dumbbell,
    text: "Mantiene la inscripción durante un ciclo con inicio y finalización.",
  },
} as const;

const modeExamples: Record<string, string> = {
  HORARIO_FIJO:
    "Ejemplo: fútbol, lunes, miércoles y viernes de 15 a 17. La inscripción incluye obligatoriamente los tres días.",
  TURNO_RECURRENTE:
    "Ejemplo: yoga ofrece turnos de lunes a viernes a las 10, 13 y 16. La persona elige lunes y miércoles a las 13.",
  TURNO_PUNTUAL:
    "Ejemplo: ciber por bloques de 90 minutos o una cancha reservada por hora.",
  ACCESO_LIBRE:
    "Ejemplo: pileta libre o un espacio recreativo abierto durante todo el día.",
  EVENTO_UNICO:
    "Ejemplo: torneo, charla o jornada especial en una fecha determinada.",
  CURSO_PERIODO:
    "Ejemplo: curso de computación de marzo a junio, martes y jueves.",
};

export function ActivityWorkflow({ draftId }: { draftId: string }) {
  const catalogs = useActivityCatalogs();
  const [draft, setDraft] = useState<ActivityDraft | null>(null),
    [payload, setPayload] = useState<ActivityDraftPayload | null>(null),
    [step, setStep] = useState(1),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [stepLoading, setStepLoading] = useState(false),
    [publishing, setPublishing] = useState(false),
    [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [discardOpen, setDiscardOpen] = useState(false),
    [discarding, setDiscarding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [options, setOptions] = useState<WorkflowOptions>({
    establishments: [],
    professors: [],
    requirements: [],
    resources: [],
  });
  const hasUnsavedChanges = Boolean(draft && payload && draftFingerprint(payload) !== draftFingerprint(draft.payload));
  const navigation: ReturnType<typeof useActivityDraftNavigation> = useActivityDraftNavigation(() => hasUnsavedChanges || autosave.saving || saving || publishing || discarding);
  const autosave = useActivityDraftAutosave({
    draft, payload, step,
    paused: saving || publishing || discarding || discardOpen || Boolean(navigation.destination),
    onSaved: (result) => {
      setDraft(result);
      setPayload((current) => current && draftFingerprint(current) === draftFingerprint(result.payload) ? result.payload : current);
    },
  });
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void Promise.all([
      getDraftClient(draftId),
      listActiveEstablecimientosClient(),
      listarProfesoresClient({ page: 1, pageSize: 100, estado: "ACTIVO" }),
      listRequirementsClient({ active: true }),
      listResourcesClient(),
    ])
      .then(([d, establishments, professors, requirements, resources]) => {
        if (!active) return;
        if (d.status === "PUBLICANDO") throw new Error("La actividad se está guardando en otra sesión. Intentá nuevamente en unos segundos.");
        setDraft(d);
        setPayload(d.payload);
        setStep(d.currentStep);
        setOptions({
          establishments,
          professors: professors.data,
          requirements,
          resources,
        });
      })
      .catch((error) => { if (active) setLoadError(error instanceof Error && !('response' in error) ? error.message : getAxiosMessage(error, "No pudimos cargar el borrador.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [draftId, loadAttempt]);
  const pendingSteps = useMemo(
    () => new Set(draft?.pending.map((item) => item.step) ?? []),
    [draft],
  );
  useEffect(() => {
    if (!draft) return;
    setCompletedSteps(
      new Set(
        steps
          .map((_, index) => index + 1)
          .filter(
            (number) =>
              number < draft.currentStep &&
              !draft.pending.some((item) => item.step === number),
          ),
      ),
    );
  }, [draft]);
  if (loading || catalogs.loading)
    return <CatalogLoadingState label="configuración de actividad" fullPage />;
  if (loadError || !payload || !draft) return <main className="min-h-full bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8"><p role="alert" className="text-sm text-[var(--brand-muted)]">{loadError || "No pudimos cargar el borrador."}</p><div className="mt-4 flex gap-3"><Button variant="outline" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Reintentar</Button><Button variant="outline" onClick={() => navigation.navigate("/activities")}>Volver a actividades</Button></div></main>;
  const patch = (changes: Partial<ActivityDraftPayload>) =>
    setPayload((current) => (current ? { ...current, ...changes } : current));
  async function save(targetStep = step, leave = false) {
    const validatedStep = step;
    setSaving(true);
    if (!leave && targetStep !== step) setStepLoading(true);
    try {
      const saved = await autosave.flush(targetStep);
      if (!saved.pending.some((item) => item.step === validatedStep))
        setCompletedSteps((current) => new Set(current).add(validatedStep));
      setStep(targetStep);
      if (leave) {
        await autosave.stop();
        toast.success(saved.hasChanges ? "Borrador guardado." : "Sin cambios pendientes.");
        navigation.navigate(navigation.destination ?? `/activities${draft!.activityId ? `?selected=${draft!.activityId}` : ""}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos guardar el borrador.",
      );
    } finally {
      setSaving(false);
      setStepLoading(false);
    }
  }
  async function publish() {
    setPublishing(true);
    try {
      const saved = await autosave.flush(step);
      await autosave.stop();
      const activity = await publishDraftClient(saved.id, saved.updatedAt);
      toast.success(
        draft!.activityId
          ? "Cambios guardados correctamente."
          : "Actividad creada correctamente.",
      );
      navigation.navigate(`/activities?selected=${activity.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : draft!.activityId
            ? "No pudimos guardar los cambios."
            : "La actividad todavía no puede publicarse.",
      );
    } finally {
      autosave.resume();
      setPublishing(false);
    }
  }
  async function discard() {
    setDiscarding(true);
    try {
      const saved = await autosave.stop();
      if (!saved) return;
      await discardDraftClient(saved.id, saved.updatedAt);
      toast.success("Saliste sin guardar cambios.");
      navigation.navigate(
        `/activities${draft!.activityId ? `?selected=${draft!.activityId}` : ""}`,
      );
    } catch (error) {
      toast.error(getAxiosMessage(error, "No pudimos descartar los cambios."));
    } finally {
      autosave.resume();
      setDiscarding(false);
      setDiscardOpen(false);
    }
  }
  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--brand-border)] pb-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
            {payload.imagenUrl ? (
              <Image
                src={payload.imagenUrl}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <ImageIcon className="size-7" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">
              {payload.nombre || "Nueva actividad"}
            </h1>
            <p className="mt-2 text-sm text-[var(--brand-text)]/80 sm:text-base">
              Paso {step} de {steps.length} · {draft.activityId ? "Prepará los cambios; se aplicarán al guardar la actividad." : "Completá la configuración para crear la actividad."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {draft.hasChanges || hasUnsavedChanges ? (
            <Button
              variant="outline"
              onClick={() => setDiscardOpen(true)}
              disabled={saving || publishing || discarding || autosave.conflict}
              className="h-12 rounded-xl border-[var(--brand-primary)]/30 bg-white px-6 font-bold text-[var(--brand-primary)]"
            >
              <ArrowLeft />
              Descartar cambios
            </Button>
          ) : null}
          <Button
            onClick={() => autosave.conflict ? navigation.request(`/activities${draft.activityId ? `?selected=${draft.activityId}` : ""}`) : void save(step, true)}
            disabled={saving || publishing || discarding}
            className="h-12 rounded-xl bg-[var(--brand-primary)] px-7 text-base font-bold text-white hover:bg-[var(--brand-primary-hover)]"
          >
            <Save />
            {!autosave.conflict && (draft.hasChanges || hasUnsavedChanges) ? "Guardar borrador y salir" : "Salir"}
          </Button>
        </div>
      </header>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--brand-primary)]" role="status" aria-live="polite">
        {autosave.saving ? <><Loader2 className="size-4 animate-spin" />Guardando borrador...</> : autosave.error ? <span className="text-red-700">{autosave.error}</span> : hasUnsavedChanges ? "Cambios pendientes de guardar..." : draft.hasChanges ? `Borrador guardado · ${draft.lastEditedBy || "Administrador"} · ${new Date(draft.updatedAt).toLocaleString("es-AR")}` : "Sin cambios pendientes"}
        {autosave.error && !autosave.conflict ? <Button variant="outline" size="sm" onClick={() => void autosave.flush().catch(() => undefined)}>Reintentar guardado</Button> : null}
        {autosave.conflict ? <span>Para cargar la otra versión, salí de esta pantalla y volvé a abrir la edición.</span> : null}
      </div>
      <fieldset disabled={saving || publishing || discarding || autosave.conflict} className="mt-6 min-w-0">
        <AdminWorkflowLayout
          sections={steps.map((label, index) => {
            const id = index + 1;
            return {
              id,
              label,
              icon: stepIcons[index],
              status: pendingSteps.has(id) && id < step
                ? "invalid" as const
                : completedSteps.has(id)
                  ? "valid" as const
                  : "pending" as const,
            };
          })}
          activeSection={step}
          onSectionChange={(target) => void save(target)}
          navigationLabel="Pasos de la actividad"
        >
        <section className="relative min-h-[520px] overflow-hidden rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 shadow-sm sm:p-8">
          {stepLoading ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-white">
              <div className="flex flex-col items-center gap-3 text-[var(--brand-primary)]">
                <Loader2 className="size-8 animate-spin" />
                <p className="text-sm font-bold">
                  Cargando información de la actividad...
                </p>
              </div>
            </div>
          ) : null}
          <div className="mb-6 border-b border-[var(--brand-border)] pb-5">
            <h2 className="text-2xl font-extrabold text-[var(--brand-primary)]">
              {steps[step - 1]}
            </h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              {stepDescription(step)}
            </p>
          </div>
          <StepContent
            draftId={draft.id}
            step={step}
            payload={payload}
            pending={draft.pending}
            onGoToStep={(target) => void save(target)}
            patch={patch}
            options={options}
            categories={catalogs.categories}
            publics={catalogs.publics}
          />
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:justify-between">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
              disabled={step === 1 || saving}
              onClick={() => void save(step - 1)}
            >
              <ArrowLeft className="size-5" />
              Anterior
            </Button>
            {step < steps.length ? (
              <Button
                type="button"
                size="lg"
                disabled={saving}
                onClick={() => void save(step + 1)}
                className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
              >
                {saving ? <Loader2 className="animate-spin" /> : null}Continuar
                <ArrowRight className="size-5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="lg"
                disabled={publishing || draft.pending.length > 0}
                onClick={() => void publish()}
                className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
              >
                {publishing ? <Loader2 className="animate-spin" /> : <Check />}
                {draft.activityId ? "Guardar cambios" : "Crear actividad"}
              </Button>
            )}
          </div>
        </section>
        </AdminWorkflowLayout>
      </fieldset>
      <ActivityDraftLeaveDialog
        open={Boolean(navigation.destination)}
        busy={saving || discarding || publishing}
        conflict={autosave.conflict}
        onSave={() => void save(step, true)}
        onCancel={navigation.cancel}
        onDiscard={() => {
          const destination = navigation.destination;
          if (!destination) return;
          setDiscarding(true);
          void autosave.stop()
            .then(() => navigation.navigate(destination))
            .catch((error) => toast.error(getAxiosMessage(error, "No pudimos salir de la edición.")))
            .finally(() => setDiscarding(false));
        }}
      />
      <ConfirmDialog
        open={discardOpen}
        title="¿Descartar todos los cambios?"
        description={draft.activityId ? "Se eliminarán todos los cambios del borrador, incluidos los guardados automáticamente. La actividad publicada permanecerá sin cambios." : "Se eliminará el borrador de esta nueva actividad."}
        confirmLabel="Descartar cambios"
        loading={discarding}
        onClose={() => { if (!discarding) setDiscardOpen(false); }}
        onConfirm={() => void discard()}
      />
    </main>
  );
}

function StepContent({
  draftId,
  step,
  payload,
  pending,
  onGoToStep,
  patch,
  options,
  categories,
  publics,
}: {
  draftId: string;
  step: number;
  payload: ActivityDraftPayload;
  pending: ActivityDraftPending[];
  onGoToStep: (step: number) => void;
  patch: (value: Partial<ActivityDraftPayload>) => void;
  options: WorkflowOptions;
  categories: CategoriaActividad[];
  publics: WorkflowPublic[];
}) {
  if (step === 1)
    return (
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {modes.map(([value, title]) => {
          const presentation = modePresentation[value];
          const Icon = presentation.icon;
          return (
            <button
              key={value}
              onClick={() =>
                patch({
                  modalidadOperacion: value,
                  modalidadInscripcion: [
                    "TURNO_PUNTUAL",
                    "EVENTO_UNICO",
                  ].includes(value)
                    ? "POR_CLASE"
                    : value === "CURSO_PERIODO"
                      ? "POR_PERIODO"
                      : "PERMANENTE",
                  requiereReserva: value !== "ACCESO_LIBRE",
                })
              }
              className={`flex min-w-0 gap-3 rounded-2xl border p-4 text-left transition 2xl:gap-4 2xl:p-5 ${payload.modalidadOperacion === value ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] ring-2 ring-[var(--brand-secondary)]/30" : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)]"}`}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words font-extrabold text-[var(--brand-primary)]">
                  {title}
                </span>
                <span className="mt-2 block break-words text-sm leading-relaxed text-[var(--brand-muted)]">
                  {presentation.text}
                </span>
                <span className="mt-3 block break-words rounded-xl bg-[var(--brand-page)] p-3 text-xs font-bold leading-relaxed text-[var(--brand-text)]">
                  {modeExamples[value]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  if (step === 2)
    return (
      <GeneralInformation
        payload={payload}
        patch={patch}
        categories={categories}
      />
    );
  if (step === 3)
    return (
      <div className="space-y-3">
        <Label className="font-bold text-[var(--brand-ink)]">Sedes *</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.establishments.map((establishment) => (
            <CheckCard
              key={establishment.id}
              checked={payload.establecimientoIds.includes(establishment.id)}
              label={`${establishment.nombre} · ${establishment.direccion}`}
              onChange={(checked) => {
                const nextIds = checked
                  ? [...payload.establecimientoIds, establishment.id]
                  : payload.establecimientoIds.filter((id) => id !== establishment.id);
                patch({
                  establecimientoIds: nextIds,
                  schedules: payload.schedules.map((item) => {
                    const keepsEstablishment = nextIds.includes(item.establecimientoId);
                    return {
                      ...item,
                      // Nunca vaciar la sede: si no queda ninguna seleccionada, conservamos la
                      // actual (el paso quedará marcado como pendiente hasta elegir una nueva).
                      establecimientoId: keepsEstablishment ? item.establecimientoId : (nextIds[0] ?? item.establecimientoId),
                      recursoIds: keepsEstablishment ? item.recursoIds : [],
                    };
                  }),
                });
              }}
            />
          ))}
        </div>
        {!options.establishments.length ? (
          <Missing text="No hay establecimientos disponibles. La actividad puede guardarse, pero seguirá incompleta." />
        ) : null}
      </div>
    );
  if (step === 4)
    return (
      <HorariosStep
        draftId={draftId}
        payload={payload}
        patch={patch}
        establishments={options.establishments}
        professors={options.professors}
        resources={options.resources}
      />
    );
  if (step === 5)
    return (
      <div className="space-y-4">
        <Missing text="Este paso es opcional. Si no seleccionás ningún público, la actividad estará disponible para todas las personas." />
        <WorkflowSelectionBrowser
          options={publics.map((item) => ({
            id: item.id,
            title: item.nombre,
            subtitle: [
              item.edadMinimaSugerida != null
                ? `Desde ${item.edadMinimaSugerida} años`
                : null,
              item.edadMaximaSugerida != null
                ? `Hasta ${item.edadMaximaSugerida} años`
                : null,
              item.genero ? `Género: ${item.genero}` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            description: item.descripcion,
          }))}
          selectedIds={payload.publicosObjetivoIds}
          searchPlaceholder="Buscar público objetivo..."
          emptyTitle="No se encontraron públicos."
          onToggle={(id, checked) =>
            patch({
              publicosObjetivoIds: checked
                ? [...new Set([...payload.publicosObjetivoIds, id])]
                : payload.publicosObjetivoIds.filter((item) => item !== id),
            })
          }
        />
      </div>
    );
  if (step === 6)
    return (
      <div className="space-y-4">
        <Missing text="Este paso es opcional. Si no seleccionás ninguno, la actividad se publicará sin requisitos." />
        <WorkflowSelectionBrowser
          options={options.requirements.map((item) => ({
            id: item.id,
            title: item.nombre,
            subtitle: `${item.tipo} · ${item.obligatoriedad === "RECOMENDADO" ? "Recomendado" : "Obligatorio"}`,
            description: item.descripcion ?? item.instrucciones,
            meta: item.requiereDocumento
              ? "Requiere documentación"
              : item.controlarAlIngreso
                ? "Se controla al ingresar"
                : null,
          }))}
          selectedIds={payload.requirements.map((item) => item.requisitoId)}
          searchPlaceholder="Buscar requisito por nombre o tipo..."
          emptyTitle="No se encontraron requisitos."
          onToggle={(id, checked) => {
            const requirement = options.requirements.find(
              (item) => item.id === id,
            );
            patch({
              requirements: checked
                ? [
                    ...payload.requirements,
                    {
                      requisitoId: id,
                      obligatorio:
                        requirement?.obligatoriedad !== "RECOMENDADO",
                      observaciones: null,
                      orden: payload.requirements.length,
                    },
                  ]
                : payload.requirements.filter(
                    (item) => item.requisitoId !== id,
                  ),
            });
          }}
        />
      </div>
    );
  if (step === 7)
    return <ReservationSettings payload={payload} patch={patch} />;
  return <Review payload={payload} pending={pending} onGoToStep={onGoToStep} />;
}

function Review({
  payload,
  pending,
  onGoToStep,
}: {
  payload: ActivityDraftPayload;
  pending: ActivityDraftPending[];
  onGoToStep: (step: number) => void;
}) {
  return (
    <div className="space-y-5">
      {pending.length ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 size-6 shrink-0 text-amber-700" />
            <div>
              <h3 className="font-extrabold text-amber-950">
                Puntos pendientes de revisión
              </h3>
              <p className="mt-1 text-sm text-amber-900">
                Corregí estos puntos antes de crear la actividad.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {pending.map((item) => (
              <div
                key={`${item.step}-${item.key}`}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase text-[var(--brand-secondary)]">
                    {steps[item.step - 1]}
                  </p>
                  <p className="mt-1 font-bold text-[var(--brand-ink)]">{item.label}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 border-[var(--brand-secondary)] font-bold text-[var(--brand-primary)]"
                  onClick={() => onGoToStep(item.step)}
                >
                  Corregir
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-2xl border border-[var(--brand-secondary)]/40 bg-[var(--brand-panel)] p-4 sm:p-5">
          <Check className="mt-0.5 size-6 shrink-0 text-[var(--brand-primary)]" />
          <div>
            <h3 className="font-extrabold text-[var(--brand-ink)]">
              Actividad lista para crear
            </h3>
            <p className="mt-1 text-sm text-[var(--brand-text)]">
              No quedan puntos obligatorios pendientes.
            </p>
          </div>
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Summary
          label="Modalidad"
          value={
            modes.find(
              ([value]) => value === payload.modalidadOperacion,
            )?.[1] ?? "Pendiente"
          }
        />
        <Summary label="Actividad" value={payload.nombre || "Pendiente"} />
        <Summary
          label="Horarios"
          value={`${payload.schedules.length} configurados`}
        />
        <Summary
          label="Clases iniciales"
          value={
            payload.modalidadOperacion === "ACCESO_LIBRE"
              ? "No requiere"
              : payload.generacionClasesDesde && payload.generacionClasesHasta
                ? `${payload.generacionClasesDesde} a ${payload.generacionClasesHasta}`
                : "Pendiente"
          }
        />
        <Summary
          label="Públicos"
          value={
            payload.publicosObjetivoIds.length
              ? `${payload.publicosObjetivoIds.length} seleccionados`
              : "Todo público"
          }
        />
        <Summary
          label="Requisitos"
          value={
            payload.requirements.length
              ? `${payload.requirements.length} seleccionados`
              : "Sin requisitos"
          }
        />
        <Summary
          label="Cupo máximo"
          value={
            payload.requiereReserva
              ? String(payload.cupo ?? "Pendiente")
              : "No requiere reserva"
          }
        />
      </div>
    </div>
  );
}
// Posibles helpers legados: conservar hasta completar la separación del workflow.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-2 ${wide ? "sm:col-span-2" : ""}`}>
      <Label className="font-bold text-[var(--brand-ink)]">{label}</Label>
      {children}
    </div>
  );
}
function Missing({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {text}
    </p>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)] p-4">
      <p className="text-xs font-bold uppercase text-[var(--brand-secondary)]">{label}</p>
      <p className="mt-1 font-extrabold text-[var(--brand-primary)]">{value}</p>
    </div>
  );
}
function stepDescription(step: number) {
  return [
    "Elegí cómo se ofrecerá la actividad.",
    "Completá los datos que identifican la propuesta.",
    "Seleccioná dónde se desarrollará.",
    "Cargá cada horario con sus días, sede, profesores, recursos, cupo y turnos.",
    "Indicá quiénes pueden participar.",
    "Seleccioná documentación, elementos y condiciones.",
    "Definí vigencia, turnos y cancelaciones.",
    "Revisá los pendientes antes de crear la actividad.",
  ][step - 1];
}
