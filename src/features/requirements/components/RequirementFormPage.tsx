"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Hash,
  Info,
  ListChecks,
  Loader2,
  PackageCheck,
  Power,
  Save,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminFormError,
  AdminFormLoading,
  AdminFormPage,
} from "@/components/layout/admin-form-page";
import {
  AdminFormCard,
  AdminStatusSwitchField,
  adminControlClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/components/shared/admin-patterns";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toSlug } from "@/lib/slug";
import { ActivityImageUploader } from "@/features/actividades/components/ActivityImageUploader";

import { requirementSchema } from "../schemas/requirement.schema";
import {
  createRequirementClient,
  getRequirementClient,
  updateRequirementClient,
} from "../services/requirements.service";
import type {
  CreateRequirementInput,
  RequirementType,
} from "../types/requirement.types";

type FormState = Omit<CreateRequirementInput, "slug"> & { slug?: string };

const emptyForm: FormState = {
  nombre: "",
  descripcion: null,
  imagenUrl: null,
  tipo: "INFORMACION",
  requiereDocumento: false,
  documentoPersonal: false,
  tieneVencimiento: false,
  vigenciaDias: null,
  diasAvisoVencimiento: 30,
  obligatoriedad: "OBLIGATORIO",
  provistoPorInstitucion: false,
  requiereConfirmacion: false,
  controlarAlIngreso: false,
  aplicaEnCadaClase: false,
  instrucciones: null,
  orden: 0,
  activo: true,
};

export function RequirementFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const slug = useMemo(() => toSlug(form.nombre), [form.nombre]);
  const isEdit = Boolean(id);
  const isDocument = form.tipo === "DOCUMENTO";
  const isPhysicalItem = form.tipo === "ELEMENTO_PERSONAL";

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void getRequirementClient(id)
      .then((item) => {
        setForm({
          nombre: item.nombre,
          slug: item.slug,
          descripcion: item.descripcion,
          imagenUrl: item.imagenUrl,
          tipo: item.tipo,
          requiereDocumento: item.requiereDocumento,
          documentoPersonal: item.documentoPersonal,
          tieneVencimiento: item.tieneVencimiento,
          vigenciaDias: item.vigenciaDias,
          diasAvisoVencimiento: item.diasAvisoVencimiento,
          obligatoriedad: item.obligatoriedad,
          provistoPorInstitucion: item.provistoPorInstitucion,
          requiereConfirmacion: item.requiereConfirmacion,
          controlarAlIngreso: item.controlarAlIngreso,
          aplicaEnCadaClase: item.aplicaEnCadaClase,
          instrucciones: item.instrucciones,
          orden: item.orden,
          activo: item.activo,
        });
      })
      .catch(() => setLoadError("No se encontró el requisito solicitado."))
      .finally(() => setLoading(false));
  }, [id]);

  function update(changes: Partial<FormState>) {
    setForm((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(changes).forEach((key) => delete next[key]);
      return next;
    });
    setFormError(null);
  }

  function changeType(tipo: RequirementType) {
    update({
      tipo,
      requiereDocumento: tipo === "DOCUMENTO",
      documentoPersonal: tipo === "DOCUMENTO",
      tieneVencimiento: tipo === "DOCUMENTO" ? form.tieneVencimiento : false,
      vigenciaDias: tipo === "DOCUMENTO" ? form.vigenciaDias : null,
      provistoPorInstitucion:
        tipo === "ELEMENTO_PERSONAL" ? form.provistoPorInstitucion : false,
      aplicaEnCadaClase:
        tipo === "ELEMENTO_PERSONAL" ? form.aplicaEnCadaClase : false,
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = requirementSchema.safeParse({ ...form, slug });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([key, messages]) => [
            key,
            messages?.[0] ?? "Dato inválido",
          ]),
        ),
      );
      setFormError("Revisá los campos marcados antes de continuar.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const { activo: activeStatus, ...editableData } = parsed.data;
      void activeStatus;
      const saved = id
        ? await updateRequirementClient(id, editableData)
        : await createRequirementClient(parsed.data);
      toast.success(id ? "Requisito actualizado." : "Requisito creado.");
      router.replace(`/requirements?selected=${saved.id}`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar el requisito.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminFormPage title="Requisito" description="Cargando configuración." icon={ClipboardCheck} fullWidth>
        <AdminFormLoading label="Cargando requisito..." />
      </AdminFormPage>
    );
  }
  if (loadError) {
    return (
      <AdminFormPage title="Requisito" description="No pudimos cargar la configuración." icon={ClipboardCheck} fullWidth>
        <AdminFormError message={loadError} backHref="/requirements" />
      </AdminFormPage>
    );
  }

  return (
    <AdminFormPage
      title={isEdit ? "Editar requisito" : "Nuevo requisito"}
      description={
        isEdit
          ? "Modificá la información y las reglas del requisito."
          : "Completá la referencia que se asociará con las actividades."
      }
      icon={ClipboardCheck}
      fullWidth
    >
      <form onSubmit={submit} className="w-full text-[var(--brand-ink)]" noValidate>
        <AdminFormCard
          title="Datos del requisito"
          description="Definí qué necesita cumplir o presentar la persona para participar de una actividad."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {formError ? (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-800 sm:col-span-2">
                {formError}
              </p>
            ) : null}

            <FormField label="Nombre" icon={ClipboardCheck} error={errors.nombre} required>
              <Input value={form.nombre} onChange={(event) => update({ nombre: event.target.value })} placeholder="Ej.: Apto físico" className={adminControlClass} />
            </FormField>

            <FormField label="Slug" icon={Hash}>
              <div className="flex h-11 items-center rounded-xl border border-[var(--brand-border)] bg-[var(--brand-control)] pl-10 pr-3 font-mono text-sm font-medium text-[var(--brand-primary)]">
                {slug || "se-generara-desde-el-nombre"}
              </div>
            </FormField>

            <FormField label="Tipo" icon={ListChecks} error={errors.tipo} required>
              <Select value={form.tipo} onValueChange={(value) => changeType(value as RequirementType)}>
                <SelectTrigger className={cn(adminControlClass, "w-full")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFORMACION">Información</SelectItem>
                  <SelectItem value="DOCUMENTO">Documento</SelectItem>
                  <SelectItem value="CONSENTIMIENTO">Consentimiento</SelectItem>
                  <SelectItem value="ELEMENTO_PERSONAL">Elemento personal</SelectItem>
                  <SelectItem value="CONDICION">Condición o indicación</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Carácter" icon={ShieldCheck} error={errors.obligatoriedad} required>
              <Select value={form.obligatoriedad} onValueChange={(value) => update({ obligatoriedad: value as FormState["obligatoriedad"] })}>
                <SelectTrigger className={cn(adminControlClass, "w-full")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OBLIGATORIO">Obligatorio</SelectItem>
                  <SelectItem value="RECOMENDADO">Recomendado</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Descripción" icon={Info} error={errors.descripcion} wide align="start">
              <Textarea value={form.descripcion ?? ""} onChange={(event) => update({ descripcion: event.target.value })} rows={3} placeholder="Explicá brevemente en qué consiste" className={cn(adminControlClass, "min-h-28 h-auto py-3")} />
            </FormField>

            <div className="sm:col-span-2">
              <ActivityImageUploader value={form.imagenUrl ?? null} onChange={(imagenUrl) => update({ imagenUrl })} endpoint="/requirements/images" subject="requisito" maxDimension={512} allowUrl={false} sidePreview />
            </div>

            <FormField label="Instrucciones" icon={FileText} error={errors.instrucciones} wide align="start">
              <Textarea value={form.instrucciones ?? ""} onChange={(event) => update({ instrucciones: event.target.value })} rows={3} placeholder="Indicaciones que verá el ciudadano" className={cn(adminControlClass, "min-h-28 h-auto py-3")} />
            </FormField>

            <SwitchField label="Requiere confirmación del usuario" description="La persona deberá aceptar que comprendió este requisito." icon={CheckCircle2} checked={form.requiereConfirmacion} onChange={(requiereConfirmacion) => update({ requiereConfirmacion })} />
            <SwitchField label="Controlar al ingresar" description="Recepción deberá verificarlo al momento del acceso." icon={ShieldCheck} checked={form.controlarAlIngreso} onChange={(controlarAlIngreso) => update({ controlarAlIngreso })} />

            {isPhysicalItem ? (
              <>
                <SwitchField label="Lo proporciona la institución" description="El elemento será entregado por la organización." icon={PackageCheck} checked={form.provistoPorInstitucion} onChange={(provistoPorInstitucion) => update({ provistoPorInstitucion })} />
                <SwitchField label="Se necesita en cada clase" description="Debe presentarse cada vez que se realiza la actividad." icon={ClipboardCheck} checked={form.aplicaEnCadaClase} onChange={(aplicaEnCadaClase) => update({ aplicaEnCadaClase })} />
              </>
            ) : null}

            {isDocument ? (
              <>
                <SwitchField label="Tiene vencimiento" description="El documento deberá renovarse según su vigencia." icon={Timer} checked={form.tieneVencimiento} onChange={(tieneVencimiento) => update({ tieneVencimiento, vigenciaDias: tieneVencimiento ? form.vigenciaDias : null })} />
                {form.tieneVencimiento ? (
                  <FormField label="Vigencia en días" icon={Timer} error={errors.vigenciaDias} required>
                    <Input type="number" min={1} value={form.vigenciaDias ?? ""} onChange={(event) => update({ vigenciaDias: event.target.value ? Number(event.target.value) : null })} placeholder="Ej.: 365" className={adminControlClass} />
                  </FormField>
                ) : null}
                {form.tieneVencimiento ? (
                  <FormField label="Avisar con anticipación" icon={BellRing} error={errors.diasAvisoVencimiento} required>
                    <Input type="number" min={0} value={form.diasAvisoVencimiento} onChange={(event) => update({ diasAvisoVencimiento: Number(event.target.value) })} className={adminControlClass} />
                  </FormField>
                ) : null}
              </>
            ) : null}

            <FormField label="Orden" icon={Hash} error={errors.orden} required>
              <Input type="number" step={1} value={form.orden} onChange={(event) => update({ orden: Number(event.target.value) })} className={adminControlClass} />
            </FormField>

            <AdminStatusSwitchField checked={form.activo} onCheckedChange={(activo) => update({ activo })} icon={Power} activeLabel="Requisito activo" inactiveLabel="Requisito inactivo" activeDescription="Disponible para asociar con actividades." inactiveDescription="No estará disponible para nuevas asociaciones." disabled={isEdit} />
            {isEdit ? <p className="text-xs font-medium text-[var(--brand-muted)] sm:col-start-2">El estado se modifica desde las acciones del detalle.</p> : null}
          </div>
        </AdminFormCard>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push("/requirements")} disabled={saving} className={adminSecondaryButtonClass}><ArrowLeft />Volver</Button>
          <Button type="submit" disabled={saving} className={cn(adminPrimaryButtonClass, "min-w-48")}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {isEdit ? "Guardar cambios" : "Crear requisito"}
          </Button>
        </div>
      </form>
    </AdminFormPage>
  );
}

function FormField({ label, icon: Icon, error, required, wide, align = "center", children }: { label: string; icon: LucideIcon; error?: string; required?: boolean; wide?: boolean; align?: "center" | "start"; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", wide && "sm:col-span-2")}>
      <Label className="font-extrabold text-[var(--brand-ink)]">{label}{required ? " *" : ""}</Label>
      <div className="relative">
        <Icon className={cn("pointer-events-none absolute left-3 z-10 size-5 text-[var(--brand-primary)]", align === "start" ? "top-3.5" : "top-1/2 -translate-y-1/2")} aria-hidden="true" />
        <div className="[&_input]:pl-10 [&_[role=combobox]]:pl-10 [&_textarea]:pl-10">{children}</div>
      </div>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function SwitchField({ label, description, icon: Icon, checked, onChange, disabled = false }: { label: string; description: string; icon: LucideIcon; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cn("flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-control)] px-4 py-3", disabled && "opacity-75")}>
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
        <div>
          <Label className="font-bold text-[var(--brand-ink)]">{label}</Label>
          <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
