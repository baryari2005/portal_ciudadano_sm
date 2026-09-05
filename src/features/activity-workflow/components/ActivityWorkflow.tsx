"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  GraduationCap,
  ImageIcon,
  Loader2,
  PackageOpen,
  Plus,
  Repeat2,
  Save,
  Sparkles,
  Trash2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useActivityCatalogs } from "@/features/actividades/hooks/useActivityCatalogs";
import { GeneralInformation } from "./GeneralInformation";
import { WeeklySchedules } from "./WeeklySchedules";
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
  checkDraftProfessorAvailabilityClient,
  discardDraftClient,
  getDraftClient,
  publishDraftClient,
  saveDraftClient,
} from "../services/activity-drafts.service";
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
  PackageOpen,
  GraduationCap,
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
  "Cupos y recursos",
  "Profesores",
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
const inputClass =
  "h-12 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)] placeholder:text-[#6D8D75]";
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
  const router = useRouter(),
    catalogs = useActivityCatalogs();
  const [draft, setDraft] = useState<ActivityDraft | null>(null),
    [payload, setPayload] = useState<ActivityDraftPayload | null>(null),
    [step, setStep] = useState(1),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [stepLoading, setStepLoading] = useState(false),
    [publishing, setPublishing] = useState(false),
    [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [professorConflict, setProfessorConflict] = useState<string | null>(
    null,
  );
  const [discardOpen, setDiscardOpen] = useState(false),
    [discarding, setDiscarding] = useState(false);
  const [options, setOptions] = useState<WorkflowOptions>({
    establishments: [],
    professors: [],
    requirements: [],
    resources: [],
  });
  useEffect(() => {
    void Promise.all([
      getDraftClient(draftId),
      listActiveEstablecimientosClient(),
      listarProfesoresClient({ page: 1, pageSize: 100, estado: "ACTIVO" }),
      listRequirementsClient({ active: true }),
      listResourcesClient(),
    ])
      .then(([d, establishments, professors, requirements, resources]) => {
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
      .catch(() => toast.error("No pudimos cargar el workflow."))
      .finally(() => setLoading(false));
  }, [draftId]);
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
  useEffect(() => {
    if (step !== 6 || !payload) return;
    const professorIds = [
      ...new Set(payload.schedules.flatMap((schedule) => schedule.profesorIds)),
    ];
    if (!professorIds.length) {
      setProfessorConflict(null);
      return;
    }
    let active = true;
    void Promise.all(
      professorIds.map((professorId) =>
        checkDraftProfessorAvailabilityClient(
          draftId,
          professorId,
          payload.schedules,
        ),
      ),
    )
      .then((results) => {
        if (active)
          setProfessorConflict(
            results.find((result) => !result.available)?.message ?? null,
          );
      })
      .catch(() => {
        if (active)
          setProfessorConflict(
            "No pudimos verificar la disponibilidad de los profesores asignados.",
          );
      });
    return () => {
      active = false;
    };
  }, [step, draftId, payload]);
  if (loading || catalogs.loading || !payload || !draft)
    return <CatalogLoadingState label="configuración de actividad" fullPage />;
  const patch = (changes: Partial<ActivityDraftPayload>) =>
    setPayload((current) => (current ? { ...current, ...changes } : current));
  async function save(targetStep = step, leave = false) {
    const validatedStep = step;
    setSaving(true);
    if (!leave && targetStep !== step) setStepLoading(true);
    try {
      const saved = await saveDraftClient(draft!.id, payload!, targetStep);
      setDraft(saved);
      setPayload(saved.payload);
      if (!saved.pending.some((item) => item.step === validatedStep))
        setCompletedSteps((current) => new Set(current).add(validatedStep));
      setStep(targetStep);
      if (leave) {
        toast.success("Borrador guardado.");
        router.push("/activities");
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
      const activity = await publishDraftClient(draft!.id);
      toast.success(
        draft!.activityId
          ? "Cambios guardados correctamente."
          : "Actividad creada correctamente.",
      );
      router.replace(`/activities?selected=${activity.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : draft!.activityId
            ? "No pudimos guardar los cambios."
            : "La actividad todavía no puede publicarse.",
      );
    } finally {
      setPublishing(false);
    }
  }
  async function discard() {
    setDiscarding(true);
    try {
      await discardDraftClient(draft!.id);
      toast.success("Saliste sin guardar cambios.");
      router.replace(
        `/activities${draft!.activityId ? `?selected=${draft!.activityId}` : ""}`,
      );
    } catch {
      toast.error("No pudimos descartar los cambios.");
    } finally {
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
              Paso {step} de {steps.length} · completá la configuración para
              publicar la actividad.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {draft.activityId ? (
            <Button
              variant="outline"
              onClick={() => setDiscardOpen(true)}
              disabled={saving || discarding}
              className="h-12 rounded-xl border-[var(--brand-primary)]/30 bg-white px-6 font-bold text-[var(--brand-primary)]"
            >
              <ArrowLeft />
              Salir sin guardar
            </Button>
          ) : null}
          <Button
            onClick={() => void save(step, true)}
            disabled={saving}
            className="h-12 rounded-xl bg-[var(--brand-primary)] px-7 text-base font-bold text-white hover:bg-[var(--brand-primary-hover)]"
          >
            <Save />
            Guardar borrador y salir
          </Button>
        </div>
      </header>
      <div className="mt-6">
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
            professorConflict={professorConflict}
            setProfessorConflict={setProfessorConflict}
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
            {step < 10 ? (
              <Button
                type="button"
                size="lg"
                disabled={saving}
                onClick={() => void save(step + 1)}
                className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
              >
                {saving ? <Loader2 className="animate-spin" /> : null}Guardar y
                continuar
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
      </div>
      <ConfirmDialog
        open={discardOpen}
        title="¿Salir sin guardar?"
        description="Se descartará el borrador de edición. La actividad publicada y todos sus datos permanecerán sin cambios."
        confirmLabel="Salir sin guardar"
        loading={discarding}
        onClose={() => setDiscardOpen(false)}
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
  professorConflict,
  setProfessorConflict,
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
  professorConflict: string | null;
  setProfessorConflict: (message: string | null) => void;
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
      <div>
        <IconField label="Establecimiento *" icon={<Building2 />}>
          <Pick
            value={payload.establecimientoId}
            onChange={(establecimientoId) =>
              patch({
                establecimientoId,
                schedules: payload.schedules.map((item) => ({
                  ...item,
                  recursoIds: [],
                })),
              })
            }
            options={options.establishments.map((item) => [
              item.id,
              `${item.nombre} · ${item.direccion}`,
            ])}
          />
        </IconField>
        {!options.establishments.length ? (
          <Missing text="No hay establecimientos disponibles. La actividad puede guardarse, pero seguirá incompleta." />
        ) : null}
      </div>
    );
  if (step === 4) return <WeeklySchedules payload={payload} patch={patch} />;
  if (step === 5) {
    const resources = options.resources.filter(
      (item) =>
        item.establecimientoId === payload.establecimientoId &&
        item.estado === "ACTIVO",
    );
    return (
      <div className="space-y-5">
        <IconField label="Cupo general" icon={<UsersRound />}>
          <Input
            className={`${inputClass} pl-11`}
            type="number"
            min={1}
            disabled={!payload.requiereReserva}
            value={payload.cupo ?? ""}
            onChange={(e) =>
              patch({
                cupo: e.target.value ? Number(e.target.value) : null,
                schedules: payload.schedules.map((item) => ({
                  ...item,
                  cupoMaximo: Number(e.target.value) || 1,
                })),
              })
            }
          />
        </IconField>
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((resource) => (
            <CheckCard
              key={resource.id}
              checked={payload.schedules.some((schedule) =>
                schedule.recursoIds.includes(resource.id),
              )}
              label={`${resource.nombre} · ${resource.capacidadUnidades} u.`}
              onChange={(checked) =>
                patch({
                  schedules: payload.schedules.map((schedule) => ({
                    ...schedule,
                    recursoIds: checked
                      ? [...new Set([...schedule.recursoIds, resource.id])]
                      : schedule.recursoIds.filter((id) => id !== resource.id),
                  })),
                })
              }
            />
          ))}
        </div>
        {!resources.length ? (
          <Missing text="No hay recursos activos para este establecimiento. Solo será obligatorio si la actividad necesita uno." />
        ) : null}
      </div>
    );
  }
  if (step === 6)
    return (
      <div className="space-y-4">
        <WorkflowSelectionBrowser
          options={options.professors
            .filter((professor) =>
              ["teacher", "profesor"].includes(professor.usuario.rol?.codigo),
            )
            .map((professor) => ({
              id: professor.id,
              title:
                `${professor.usuario.nombre ?? ""} ${professor.usuario.apellido ?? ""}`.trim(),
              subtitle: professor.especialidad ?? "Sin especialidad",
              description: professor.descripcion,
              meta: `Rol: ${professor.usuario.rol?.nombre ?? "Profesor"}${professor.matricula ? ` · Matrícula ${professor.matricula}` : ""}`,
            }))}
          selectedIds={[
            ...new Set(
              payload.schedules.flatMap((schedule) => schedule.profesorIds),
            ),
          ]}
          searchPlaceholder="Buscar profesor por nombre o especialidad..."
          emptyTitle="No se encontraron profesores con rol Profesor."
          onToggle={async (id, checked) => {
            if (checked) {
              try {
                const availability =
                  await checkDraftProfessorAvailabilityClient(
                    draftId,
                    id,
                    payload.schedules,
                  );
                if (!availability.available) {
                  setProfessorConflict(availability.message);
                  toast.error(
                    availability.message ??
                      "El profesor no está disponible en esa franja.",
                  );
                  return;
                }
              } catch {
                setProfessorConflict(
                  "No pudimos verificar la disponibilidad del profesor.",
                );
                toast.error(
                  "No pudimos verificar la disponibilidad del profesor.",
                );
                return;
              }
            }
            setProfessorConflict(null);
            patch({
              schedules: payload.schedules.map((schedule) => ({
                ...schedule,
                profesorIds: checked
                  ? [...new Set([...schedule.profesorIds, id])]
                  : schedule.profesorIds.filter((item) => item !== id),
              })),
            });
          }}
        />
        {professorConflict ? (
          <p className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            <CircleAlert className="mt-0.5 size-5 shrink-0" />
            {professorConflict}
          </p>
        ) : (
          <p className="flex items-start gap-3 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-panel)] p-4 text-sm text-[var(--brand-text)]">
            <Check className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]" />
            Al seleccionar un profesor se verificará que no tenga otra actividad
            superpuesta.
          </p>
        )}
      </div>
    );
  if (step === 7)
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
  if (step === 8)
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
  if (step === 9)
    return <ReservationSettings payload={payload} patch={patch} />;
  return <Review payload={payload} pending={pending} onGoToStep={onGoToStep} />;
}

// Posible código legado: conservar hasta completar la migración a WeeklySchedules.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Schedules({
  payload,
  patch,
}: {
  payload: ActivityDraftPayload;
  patch: (value: Partial<ActivityDraftPayload>) => void;
}) {
  const add = () =>
    patch({
      schedules: [
        ...payload.schedules,
        {
          diaSemana: "LUNES",
          horaInicio: "09:00",
          horaFin: "10:00",
          espacio: null,
          cupoMaximo: payload.cupo ?? 1,
          profesorIds: [],
          recursoIds: [],
        },
      ],
    });
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={add}>
          <Plus />
          Agregar horario
        </Button>
      </div>
      {payload.schedules.map((item, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)] p-4 md:grid-cols-[1fr_1fr_1fr_1.2fr_auto]"
        >
          <Pick
            value={item.diaSemana}
            onChange={(diaSemana) =>
              patch({
                schedules: payload.schedules.map((entry, i) =>
                  i === index
                    ? { ...entry, diaSemana: diaSemana as ActivityDraftPayload["schedules"][number]["diaSemana"] }
                    : entry,
                ),
              })
            }
            options={[
              "LUNES",
              "MARTES",
              "MIERCOLES",
              "JUEVES",
              "VIERNES",
              "SABADO",
              "DOMINGO",
            ].map((value) => [value, value])}
          />
          <Input
            type="time"
            value={item.horaInicio}
            onChange={(e) =>
              patch({
                schedules: payload.schedules.map((entry, i) =>
                  i === index
                    ? { ...entry, horaInicio: e.target.value }
                    : entry,
                ),
              })
            }
          />
          <Input
            type="time"
            value={item.horaFin}
            onChange={(e) =>
              patch({
                schedules: payload.schedules.map((entry, i) =>
                  i === index ? { ...entry, horaFin: e.target.value } : entry,
                ),
              })
            }
          />
          <Input
            placeholder="Espacio"
            value={item.espacio ?? ""}
            onChange={(e) =>
              patch({
                schedules: payload.schedules.map((entry, i) =>
                  i === index ? { ...entry, espacio: e.target.value } : entry,
                ),
              })
            }
          />
          <Button
            variant="outline"
            className="text-red-700"
            onClick={() =>
              patch({
                schedules: payload.schedules.filter((_, i) => i !== index),
              })
            }
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {!payload.schedules.length ? (
        <Missing text="Todavía no configuraste horarios. Podés continuar y completarlos más adelante." />
      ) : null}
    </div>
  );
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
          label="Cupo"
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
function IconField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="font-bold text-[var(--brand-ink)]">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-3.5 z-10 text-[var(--brand-primary)] [&_svg]:size-5">
          {icon}
        </span>
        <div className="[&_button]:pl-11">{children}</div>
      </div>
    </div>
  );
}
function Pick({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={inputClass}>
        <SelectValue placeholder="Seleccionar" />
      </SelectTrigger>
      <SelectContent>
        {options.map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function CheckCard({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${checked ? "border-[var(--brand-secondary)] bg-[var(--brand-panel)]" : "border-[var(--brand-border-soft)] bg-white"}`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span className="font-bold text-[var(--brand-ink)]">{label}</span>
    </label>
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
    "Definí días y franjas disponibles.",
    "Configurá capacidad y recursos físicos.",
    "Asigná profesores aprobados cuando estén disponibles.",
    "Indicá quiénes pueden participar.",
    "Seleccioná documentación, elementos y condiciones.",
    "Definí vigencia, turnos y cancelaciones.",
    "Revisá los pendientes antes de crear la actividad.",
  ][step - 1];
}
