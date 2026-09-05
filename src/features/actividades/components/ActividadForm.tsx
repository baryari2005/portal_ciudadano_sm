"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listActiveEstablecimientosClient } from "@/features/establecimientos/services/establecimientos.service";
import type { Establecimiento } from "@/features/establecimientos/types/establecimiento.types";

import { actividadSchema } from "../schemas/actividad.schema";
import {
  createActividadClient,
  patchActividadClient,
} from "../services/actividades.service";
import type { Actividad, ActividadPayload } from "../types/actividad.types";
import { useActivityCatalogs } from "../hooks/useActivityCatalogs";
import {
  ActivityClassificationFields,
  mergeActivityCategoryOptions,
  mergeActivityPublicOptions,
} from "./ActivityClassificationFields";
import { ActivityGeneralDetailsFields } from "./ActivityGeneralDetailsFields";
import { ActivityRequirementsFields } from "./ActivityRequirementsFields";
import { ActivityEnrollmentModeFields } from "./ActivityEnrollmentModeFields";

type Props = {
  onLoadingChange?: (loading: boolean) => void;
  mode?: "create" | "edit";
  initialValues?: Actividad | null;
};

const emptyPayload: ActividadPayload = {
  nombre: "",
  descripcionCorta: null,
  descripcion: null,
  imagenUrl: null,
  color: null,
  nivel: null,
  edadMinima: null,
  edadMaxima: null,
  requiereCertificadoMedico: false,
  requiereAutorizacion: false,
  esGratuita: true,
  precio: null,
  modalidadInscripcion: "PERMANENTE",
  duracionPeriodoMeses: null,
  horasCancelacionJustificada: 24,
  modalidadOperacion: "HORARIO_FIJO",
  vigenciaReserva: "INDEFINIDA",
  duracionTurnoMinutos: null,
  intervaloTurnoMinutos: 0,
  anticipacionReservaDias: 30,
  limiteReservasPorUsuario: null,
  requiereReserva: true,
  estado: "BORRADOR",
  establecimientoId: "",
  cupo: null,
  categoriaActividadId: null,
  publicosObjetivoIds: [],
  horarios: [],
  asignados: [],
  requirements: [],
};

const stateOptions = [
  ["BORRADOR", "Borrador"],
  ["ACTIVA", "Activa"],
  ["SUSPENDIDA", "Suspendida"],
  ["BLOQUEADA", "Bloqueada"],
  ["FINALIZADA", "Finalizada"],
  ["CANCELADA", "Cancelada"],
] as const;

export function ActividadForm({ onLoadingChange, mode = "create", initialValues }: Props) {
  const router = useRouter();
  const catalogs = useActivityCatalogs();
  const [form, setForm] = useState<ActividadPayload>(emptyPayload);
  const [establishments, setEstablishments] = useState<Establecimiento[]>([]);
  const [loadingControls, setLoadingControls] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!initialValues) return;
    setForm({
      ...emptyPayload,
      nombre: initialValues.nombre,
      descripcionCorta: initialValues.descripcionCorta,
      descripcion: initialValues.descripcion,
      imagenUrl: initialValues.imagenUrl,
      color: initialValues.color,
      nivel: initialValues.nivel,
      edadMinima: initialValues.edadMinima,
      edadMaxima: initialValues.edadMaxima,
      requiereCertificadoMedico: initialValues.requiereCertificadoMedico,
      requiereAutorizacion: initialValues.requiereAutorizacion,
      esGratuita: initialValues.esGratuita,
      precio: initialValues.precio,
      modalidadInscripcion: initialValues.modalidadInscripcion,
      duracionPeriodoMeses: initialValues.duracionPeriodoMeses,
      horasCancelacionJustificada: initialValues.horasCancelacionJustificada,
      modalidadOperacion: initialValues.modalidadOperacion,
      vigenciaReserva: initialValues.vigenciaReserva,
      duracionTurnoMinutos: initialValues.duracionTurnoMinutos,
      intervaloTurnoMinutos: initialValues.intervaloTurnoMinutos,
      anticipacionReservaDias: initialValues.anticipacionReservaDias,
      limiteReservasPorUsuario: initialValues.limiteReservasPorUsuario,
      requiereReserva: initialValues.requiereReserva,
      estado: initialValues.estado,
      establecimientoId: initialValues.establecimientoId,
      cupo: initialValues.cupo,
      categoriaActividadId: initialValues.categoriaActividadId,
      publicosObjetivoIds: initialValues.publicosObjetivo.map((item) => item.id),
      requirements: initialValues.requirements.map((item) => ({ requisitoId: item.id, obligatorio: item.mandatory, observaciones: item.observations, orden: item.order })),
    });
  }, [initialValues]);

  useEffect(() => {
    let active = true;
    async function loadControls() {
      setLoadingControls(true);
      try {
        const data = await listActiveEstablecimientosClient();
        if (!active) return;
        setEstablishments(data);
        setForm((current) => ({
          ...current,
          establecimientoId: current.establecimientoId || data[0]?.id || "",
        }));
      } catch {
        toast.error("No pudimos cargar los datos auxiliares de la actividad.");
      } finally {
        if (active) setLoadingControls(false);
      }
    }
    void loadControls();
    return () => { active = false; };
  }, []);

  const loadingForm = loadingControls || catalogs.loading;

  useEffect(() => onLoadingChange?.(loadingForm), [loadingForm, onLoadingChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty || submitting) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, submitting]);

  function update(changes: Partial<ActividadPayload>) {
    setForm((current) => ({ ...current, ...changes }));
    setDirty(true);
    setErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[key]);
      return next;
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      ...form,
      nombre: form.nombre.trim(),
      descripcionCorta: form.descripcionCorta?.trim() || null,
      descripcion: form.descripcion?.trim() || null,
      imagenUrl: form.imagenUrl?.trim() || null,
      color: form.color?.trim().toUpperCase() || null,
      precio: form.esGratuita ? null : form.precio,
    };
    const parsed = actividadSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([key, messages]) => [key, messages?.[0] ?? "Dato inválido"])));
      toast.error("Revisá los campos indicados.");
      return;
    }

    setSubmitting(true);
    try {
      const saved = mode === "edit" && initialValues
        ? await patchActividadClient(initialValues.id, {
            nombre: parsed.data.nombre,
            descripcionCorta: parsed.data.descripcionCorta,
            descripcion: parsed.data.descripcion,
            imagenUrl: parsed.data.imagenUrl,
            color: parsed.data.color,
            nivel: parsed.data.nivel,
            requiereCertificadoMedico: parsed.data.requiereCertificadoMedico,
            requiereAutorizacion: parsed.data.requiereAutorizacion,
            esGratuita: parsed.data.esGratuita,
            precio: parsed.data.precio,
            modalidadInscripcion: parsed.data.modalidadInscripcion,
            duracionPeriodoMeses: parsed.data.duracionPeriodoMeses,
            horasCancelacionJustificada: parsed.data.horasCancelacionJustificada,
            modalidadOperacion: parsed.data.modalidadOperacion,
            vigenciaReserva: parsed.data.vigenciaReserva,
            duracionTurnoMinutos: parsed.data.duracionTurnoMinutos,
            intervaloTurnoMinutos: parsed.data.intervaloTurnoMinutos,
            anticipacionReservaDias: parsed.data.anticipacionReservaDias,
            limiteReservasPorUsuario: parsed.data.limiteReservasPorUsuario,
            requiereReserva: parsed.data.requiereReserva,
            estado: parsed.data.estado,
            categoriaActividadId: parsed.data.categoriaActividadId,
            publicosObjetivoIds: parsed.data.publicosObjetivoIds,
            requirements: parsed.data.requirements,
          })
        : await createActividadClient(parsed.data);
      setDirty(false);
      toast.success(mode === "edit" ? "Actividad actualizada." : "Actividad creada.");
      router.replace(`/activities?selected=${saved.id}`);
    } catch (error) {
      const message = isAxiosError<{ message?: string }>(error) && error.response?.data?.message
        ? error.response.data.message
        : "No pudimos guardar la actividad.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingForm) return <CatalogLoadingState label="formulario de actividad" />;

  const categoryOptions = mergeActivityCategoryOptions(
    catalogs.categories,
    initialValues?.categoriaActividad,
  );
  const publicOptions = mergeActivityPublicOptions(
    catalogs.publics,
    initialValues?.publicosObjetivo ?? [],
  );

  return (
    <form onSubmit={submit} className="w-full text-[var(--brand-ink)]" noValidate>
      <div className="rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 border-b border-[var(--brand-border)] pb-5">
          <h2 className="text-lg font-extrabold text-[var(--brand-heading)]">Datos de la actividad</h2>
          <p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">Información general de la propuesta municipal.</p>
        </div>
        <div className="space-y-6">
          <Field label="Nombre" error={errors.nombre} required><Input value={form.nombre} onChange={(event) => update({ nombre: event.target.value })} placeholder="Ej. Yoga" className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)]" /></Field>
          <ActivityGeneralDetailsFields value={form} onChange={update} />
          <ActivityClassificationFields categories={categoryOptions} publics={publicOptions} selectedCategoryId={form.categoriaActividadId ?? null} selectedPublicIds={form.publicosObjetivoIds} selectedPublicsError={errors.publicosObjetivoIds} selectedLevel={form.nivel ?? null} loading={catalogs.loading} error={catalogs.error} onRetry={() => void catalogs.refresh()} onCategoryChange={(categoriaActividadId) => update({ categoriaActividadId })} onPublicsChange={(publicosObjetivoIds) => update({ publicosObjetivoIds })} onLevelChange={(nivel) => update({ nivel })} />
          <ActivityRequirementsFields value={form.requirements} onChange={(requirements) => update({ requirements })} />
          <ActivityEnrollmentModeFields value={form} onChange={update} />
          <div className="space-y-2"><Label className="font-extrabold">Estado</Label><Select value={form.estado} onValueChange={(estado) => update({ estado: estado as ActividadPayload["estado"] })}><SelectTrigger className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)]"><SelectValue /></SelectTrigger><SelectContent>{stateOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-page)] p-4">
            <div className="flex items-start gap-3"><Building2 className="mt-0.5 size-5 text-[var(--brand-secondary)]" /><div className="flex-1"><p className="font-extrabold text-[var(--brand-primary)]">Compatibilidad heredada</p><p className="mt-1 text-xs text-[var(--brand-text)]/75">El establecimiento se conserva temporalmente hasta implementar HorarioActividad. No representa la sede definitiva de la propuesta.</p><Select value={form.establecimientoId} onValueChange={(establecimientoId) => update({ establecimientoId })}><SelectTrigger className="mt-3 h-11 rounded-xl border-[var(--brand-border)] bg-white"><SelectValue placeholder="Seleccionar establecimiento" /></SelectTrigger><SelectContent>{establishments.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent></Select>{errors.establecimientoId ? <p className="mt-1 text-xs text-red-700">{errors.establecimientoId}</p> : null}</div></div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={submitting} onClick={() => router.push("/activities")} className="h-12 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] px-8 font-bold sm:w-auto"><ArrowLeft /> Volver</Button>
        <Button type="submit" disabled={submitting} className="h-12 w-full rounded-xl bg-[var(--brand-primary)] px-8 font-bold text-white hover:bg-[var(--brand-primary-hover)] sm:w-auto">{submitting ? <Loader2 className="animate-spin" /> : <Save />}{submitting ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear actividad"}</Button>
      </div>
    </form>
  );
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="font-extrabold">{label}{required ? " *" : ""}</Label>{children}{error ? <p className="text-xs text-red-700">{error}</p> : null}</div>;
}
