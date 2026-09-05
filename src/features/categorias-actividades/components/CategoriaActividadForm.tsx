"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Ellipsis, FileText, Hash, Loader2, Palette, Power, Save, Shapes, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminStatusSwitchField } from "@/components/shared/admin-patterns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toSlug } from "@/lib/slug";

import { CATEGORY_ICON_OPTIONS } from "../helpers/categoria-icons";
import { categoriaActividadSchema } from "../schemas/categoria-actividad.schema";
import type {
  CategoriaActividad,
  CreateCategoriaActividadInput,
} from "../types/categoria-actividad.types";

type FormState = {
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  orden: string;
  activo: boolean;
};

const emptyForm: FormState = {
  nombre: "",
  descripcion: "",
  color: "var(--brand-primary)",
  icono: "dumbbell",
  orden: "0",
  activo: true,
};

export function CategoriaActividadForm({
  item,
  loading,
  onCancel,
  onSubmit,
}: {
  item: CategoriaActividad | null;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateCategoriaActividadInput) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const isEdit = Boolean(item);
  const slug = useMemo(() => toSlug(form.nombre), [form.nombre]);
  const selectedIconOption = CATEGORY_ICON_OPTIONS.find(
    (option) => option.value === form.icono,
  );
  const featuredIconOptions = CATEGORY_ICON_OPTIONS.slice(0, 7);
  const visibleIconOptions = showAllIcons
    ? CATEGORY_ICON_OPTIONS
    : selectedIconOption && !featuredIconOptions.includes(selectedIconOption)
      ? [...featuredIconOptions.slice(0, 6), selectedIconOption]
      : featuredIconOptions;
  useEffect(() => {
    setForm(
      item
        ? {
            nombre: item.nombre,
            descripcion: item.descripcion ?? "",
            color: item.color ?? "var(--brand-primary)",
            icono: item.icono ?? "dumbbell",
            orden: String(item.orden),
            activo: item.activo,
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
    const parsed = categoriaActividadSchema.safeParse({
      nombre: form.nombre,
      slug,
      descripcion: form.descripcion,
      color: form.color,
      icono: form.icono,
      orden: form.orden,
      activo: form.activo,
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
          : "No pudimos guardar la categoría.",
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
          Datos de la categoría
        </h2>
        <p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">
          Información requerida para clasificar las actividades del sistema.
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
          htmlFor="categoria-nombre"
          error={errors.nombre}
          icon={Tags}
          required
        >
          <Input
            id="categoria-nombre"
            value={form.nombre}
            onChange={(event) => setValue("nombre", event.target.value)}
            aria-invalid={Boolean(errors.nombre)}
            placeholder="Ej. Deportes"
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
          htmlFor="categoria-descripcion"
          error={errors.descripcion}
          icon={FileText}
        >
          <Textarea
            id="categoria-descripcion"
            value={form.descripcion}
            onChange={(event) => setValue("descripcion", event.target.value)}
            rows={3}
            className="min-h-28 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
            placeholder="Descripción breve para identificar la categoría"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Color" htmlFor="categoria-color" error={errors.color} icon={Palette}>
            <div className="grid grid-cols-[1fr_48px] gap-2">
              <Input
                id="categoria-color"
                value={form.color}
                onChange={(event) => setValue("color", event.target.value)}
                aria-invalid={Boolean(errors.color)}
                placeholder="var(--brand-primary)"
                className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
              />
              <Input
                type="color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : "var(--brand-primary)"
                }
                onChange={(event) =>
                  setValue("color", event.target.value.toUpperCase())
                }
                aria-label="Seleccionar color"
                className="h-11 cursor-pointer rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] p-1"
              />
            </div>
          </Field>

          <div className="space-y-2">
            <Label
              id="categoria-icono-label"
              className="flex items-center gap-2 font-extrabold text-[var(--brand-ink)]"
            >
              <Shapes className="size-5 text-[var(--brand-primary)]" aria-hidden="true" />
              Icono
            </Label>
            <div
              role="radiogroup"
              aria-labelledby="categoria-icono-label"
              className="grid grid-cols-4 gap-1 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-page)] p-1 sm:grid-cols-8"
            >
              {visibleIconOptions.map((option) => {
                const OptionIcon = option.icon;
                const selected = form.icono === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => setValue("icono", option.value)}
                    className={`grid h-8 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]/40 ${
                      selected
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm"
                        : "border-transparent bg-white text-[var(--brand-primary)] hover:border-[var(--brand-secondary)]/50 hover:bg-[var(--brand-panel)]"
                    }`}
                  >
                    <OptionIcon className="size-4" aria-hidden="true" />
                  </button>
                );
              })}
              <button
                type="button"
                aria-label={showAllIcons ? "Mostrar menos iconos" : "Elegir otro icono"}
                title={showAllIcons ? "Mostrar menos" : "Elegir otro"}
                onClick={() => setShowAllIcons((current) => !current)}
                className="grid h-8 place-items-center rounded-lg border border-dashed border-[var(--brand-secondary)]/50 bg-white text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]/40"
              >
                <Ellipsis className="size-4" aria-hidden="true" />
              </button>
            </div>
            {errors.icono ? (
              <p className="text-xs font-medium text-red-700">
                {errors.icono}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Orden" htmlFor="categoria-orden" error={errors.orden} icon={Hash}>
            <Input
              id="categoria-orden"
              type="number"
              step="1"
              value={form.orden}
              onChange={(event) => setValue("orden", event.target.value)}
              aria-invalid={Boolean(errors.orden)}
              className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
            />
          </Field>

          <div>
            <AdminStatusSwitchField checked={form.activo} onCheckedChange={(checked) => setValue("activo", checked)} icon={Power} activeLabel="Activa" inactiveLabel="Inactiva" activeDescription="Categoría disponible para clasificar actividades." inactiveDescription="No estará disponible para nuevas actividades." disabled={isEdit} />
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
          {isEdit ? "Guardar cambios" : "Crear categoría"}
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
        <div className={Icon ? "[&_input:not([type=color])]:pl-10 [&_textarea]:pl-10" : undefined}>{children}</div>
      </div>
      {error ? (
        <p className="text-xs font-medium text-red-700">{error}</p>
      ) : null}
    </div>
  );
}
