"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Cake, FileText, Hash, Loader2, Power, Save, UserRound, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminStatusSwitchField } from "@/components/shared/admin-patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toSlug } from "@/lib/slug";
import { GENERO_OPCIONES, type Genero } from "@/constants/genero";

import { publicoObjetivoSchema } from "../schemas/publico-objetivo.schema";
import type {
  CreatePublicoObjetivoInput,
  PublicoObjetivo,
} from "../types/publico-objetivo.types";

type FormState = {
  nombre: string;
  descripcion: string;
  orden: string;
  activo: boolean;
  edadMinimaSugerida: string;
  edadMaximaSugerida: string;
  generosAdmitidos: Genero[];
};

const emptyForm: FormState = {
  nombre: "",
  descripcion: "",
  orden: "0",
  activo: true,
  edadMinimaSugerida: "",
  edadMaximaSugerida: "",
  generosAdmitidos: [],
};

export function PublicoObjetivoForm({
  item,
  loading,
  onCancel,
  onSubmit,
}: {
  item: PublicoObjetivo | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreatePublicoObjetivoInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const isEdit = Boolean(item);
  const slug = useMemo(() => toSlug(form.nombre), [form.nombre]);

  useEffect(() => {
    setForm(
      item
        ? {
            nombre: item.nombre,
            descripcion: item.descripcion ?? "",
            orden: String(item.orden),
            activo: item.activo,
            edadMinimaSugerida: item.edadMinimaSugerida?.toString() ?? "",
            edadMaximaSugerida: item.edadMaximaSugerida?.toString() ?? "",
            generosAdmitidos: item.generosAdmitidos ?? [],
          }
        : emptyForm,
    );
    setErrors({});
    setFormError(null);
  }, [item]);

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = publicoObjetivoSchema.safeParse({
      nombre: form.nombre,
      slug,
      descripcion: form.descripcion,
      orden: form.orden,
      activo: form.activo,
      edadMinimaSugerida: form.edadMinimaSugerida || null,
      edadMaximaSugerida: form.edadMaximaSugerida || null,
      generosAdmitidos: form.generosAdmitidos,
    });

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
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No pudimos guardar el público objetivo.",
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full text-[var(--brand-ink)]"
      noValidate
    >
      <div className="w-full rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 border-b border-[var(--brand-border)] pb-5">
          <h2 className="text-lg font-extrabold text-[var(--brand-heading)]">
            Datos del público objetivo
          </h2>
          <p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">
            Información requerida para identificar a quién está dirigida cada actividad.
          </p>
        </div>
        <div className="space-y-6">
      {formError ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {formError}
        </p>
      ) : null}

      <Field
        label="Nombre"
        htmlFor="publico-nombre"
        error={errors.nombre}
        icon={UsersRound}
        required
      >
        <Input
          id="publico-nombre"
          value={form.nombre}
          onChange={(event) => setValue("nombre", event.target.value)}
          aria-invalid={Boolean(errors.nombre)}
          placeholder="Ej. Adolescentes"
          className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
        />
      </Field>

      <div className="rounded-xl border border-[var(--brand-secondary)]/25 bg-[var(--brand-page)] px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-text)]/70">
          Vista previa del slug
        </p>
        <p className="mt-1 break-all font-mono text-sm text-[var(--brand-primary)]">
          {slug || "se-generara-desde-el-nombre"}
        </p>
      </div>

      <Field
        label="Descripción"
        htmlFor="publico-descripcion"
        error={errors.descripcion}
        icon={FileText}
      >
        <Textarea
          id="publico-descripcion"
          value={form.descripcion}
          onChange={(event) => setValue("descripcion", event.target.value)}
          rows={3}
          className="min-h-28 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
          placeholder="Descripción breve del público al que se dirige"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Edad mínima" htmlFor="publico-edad-minima" error={errors.edadMinimaSugerida} icon={Cake}>
          <Input id="publico-edad-minima" type="number" min="0" max="120" value={form.edadMinimaSugerida} onChange={(event) => setValue("edadMinimaSugerida", event.target.value)} placeholder="Sin mínimo" className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]" />
        </Field>
        <Field label="Edad máxima" htmlFor="publico-edad-maxima" error={errors.edadMaximaSugerida} icon={Cake}>
          <Input id="publico-edad-maxima" type="number" min="0" max="120" value={form.edadMaximaSugerida} onChange={(event) => setValue("edadMaximaSugerida", event.target.value)} placeholder="Sin máximo" className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]" />
        </Field>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 font-extrabold text-[var(--brand-ink)]">Sexo / género admitido</Label>
        <div className="grid gap-2 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-page)] p-4 sm:grid-cols-2 lg:grid-cols-3">
          {GENERO_OPCIONES.map((genero) => <label key={genero} className="flex cursor-pointer items-center gap-2 rounded-xl  px-3 py-2 text-sm font-bold"><Checkbox checked={form.generosAdmitidos.includes(genero)} onCheckedChange={(checked) => setValue("generosAdmitidos", checked ? [...form.generosAdmitidos, genero] : form.generosAdmitidos.filter((item) => item !== genero))} />{genero.replaceAll("_", " ")}</label>)}
        </div>
        <p className="text-xs font-medium text-[var(--brand-muted)]">Si no seleccionás ninguna opción, se admiten todos los géneros.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Orden" htmlFor="publico-orden" error={errors.orden} icon={Hash}>
          <Input
            id="publico-orden"
            type="number"
            step="1"
            value={form.orden}
            onChange={(event) => setValue("orden", event.target.value)}
            aria-invalid={Boolean(errors.orden)}
            className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
          />
        </Field>

        <div>
          <AdminStatusSwitchField checked={form.activo} onCheckedChange={(checked) => setValue("activo", checked)} icon={Power} activeDescription="Público disponible para asociar con actividades." inactiveDescription="No estará disponible para nuevas asociaciones." disabled={isEdit} />
          {isEdit ? (
            <p className="mt-1.5 text-xs text-[var(--brand-text)]/70">
              El estado se cambia desde las acciones del detalle.
            </p>
          ) : null}
        </div>
      </div>

        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="h-12 w-full justify-center gap-3 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] px-8 text-base font-bold text-[var(--brand-ink)] shadow-sm hover:bg-[var(--brand-panel)] sm:w-auto"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-xl bg-[#014D31] px-8 text-base font-bold text-white shadow-sm hover:bg-[var(--brand-heading)] sm:w-auto"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save />}
          {isEdit ? "Guardar cambios" : "Crear público"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="font-extrabold text-[var(--brand-ink)]">
        {label}
        {required ? " *" : ""}
      </Label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-3.5 z-10 size-5 text-[var(--brand-primary)]" aria-hidden="true" /> : null}
        <div className={Icon ? "[&_input]:pl-10 [&_textarea]:pl-10" : undefined}>{children}</div>
      </div>
      {error ? (
        <p className="text-xs font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
