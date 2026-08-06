"use client";

import { useEffect, useState } from "react";
import { Images, ListOrdered, Loader2, Palette, RotateCcw, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

import { AdminFormHeader } from "@/components/layout/admin-form-page";
import { AdminFormCard, AdminFormField, adminControlClass, adminPrimaryButtonClass } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivityImageUploader } from "@/features/actividades/components/ActivityImageUploader";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { AUTH_IMAGES } from "@/features/auth/constants/auth-theme";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";

import { getGeneralSettingsClient, updateGeneralSettingsClient } from "../services/general-settings.service";
import type { GeneralSettings } from "../types/general-settings.types";
import { useGeneralSettingsRefresh } from "./GeneralSettingsProvider";
import { DEFAULT_EXPERIENCE_PALETTES, EXPERIENCE_KEYS, EXPERIENCE_LABELS, paletteCssVariables } from "../constants/experience-palettes";
import type { ExperienceKey, ExperiencePalette } from "../types/general-settings.types";

const initial: GeneralSettings = { pageSize: 6, loginCollageImages: [...AUTH_IMAGES.collage] as GeneralSettings["loginCollageImages"], experiencePalettes: structuredClone(DEFAULT_EXPERIENCE_PALETTES) };

const COLOR_FIELDS: Array<{ key: keyof ExperiencePalette; label: string }> = [
  { key: "primary", label: "Principal" }, { key: "primaryHover", label: "Principal hover" },
  { key: "primaryStrong", label: "Principal intenso" }, { key: "secondary", label: "Secundario" },
  { key: "accent", label: "Acento" }, { key: "highlight", label: "Selección suave" },
  { key: "neutral", label: "Neutral" },
  { key: "page", label: "Fondo de página" }, { key: "panel", label: "Fondo de panel" },
  { key: "control", label: "Fondo de controles" }, { key: "search", label: "Fondo de buscadores" },
  { key: "border", label: "Bordes" }, { key: "borderSoft", label: "Bordes suaves" },
  { key: "heading", label: "Títulos" }, { key: "ink", label: "Texto destacado" },
  { key: "text", label: "Texto general" }, { key: "muted", label: "Texto secundario" },
];

export function GeneralSettingsPage() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceKey>("administration");
  const refreshGlobal = useGeneralSettingsRefresh();

  useEffect(() => { void getGeneralSettingsClient().then(setForm).catch((error) => toast.error(getAxiosMessage(error, "No pudimos cargar los parámetros."))).finally(() => setLoading(false)); }, []);

  function setCollageImage(index: number, value: string | null) {
    if (!value) return;
    setForm((current) => ({ ...current, loginCollageImages: current.loginCollageImages.map((url, itemIndex) => itemIndex === index ? value : url) as GeneralSettings["loginCollageImages"] }));
  }

  function setPaletteColor(key: keyof ExperiencePalette, value: string) {
    setForm((current) => ({ ...current, experiencePalettes: { ...current.experiencePalettes, [selectedExperience]: { ...current.experiencePalettes[selectedExperience], [key]: value.toUpperCase() } } }));
  }

  function restorePalette() {
    setForm((current) => ({ ...current, experiencePalettes: { ...current.experiencePalettes, [selectedExperience]: { ...DEFAULT_EXPERIENCE_PALETTES[selectedExperience] } } }));
  }

  async function save() {
    setSaving(true);
    try { setForm(await updateGeneralSettingsClient(form)); await refreshGlobal(); toast.success("Parámetros generales guardados."); }
    catch (error) { toast.error(getAxiosMessage(error, "No pudimos guardar los parámetros.")); }
    finally { setSaving(false); }
  }

  if (loading) return <CatalogLoadingState label="parámetros generales" fullPage />;

  return <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
    <AdminFormHeader icon={Settings2} title="Parámetros generales" description="Administrá los valores transversales de la experiencia y la identidad visual del acceso." className="mb-0" />
    <div className="brand-scrollbar min-h-0 overflow-y-auto pr-2">
      <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <AdminFormCard title="Configuración general" description="Definí los valores compartidos que utiliza el sistema.">
          <div className="space-y-7">
            <section>
              <SectionHeader icon={ListOrdered} title="Listados administrativos" description="Definí la cantidad de registros visibles en las pantallas con paginado compartido." />
              <AdminFormField label="Registros por página" icon={ListOrdered} className="max-w-md">
                <Input type="number" min={3} max={100} value={form.pageSize} onChange={(event) => setForm((current) => ({ ...current, pageSize: Number(event.target.value) }))} className={adminControlClass} />
              </AdminFormField>
            </section>
            <section className="border-t border-[var(--brand-border)] pt-7">
              <SectionHeader icon={Palette} title="Paletas por experiencia" description="Personalizá la identidad visual de cada portal. Los estados de error, advertencia y éxito conservan sus colores funcionales." bordered={false} />
              <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {EXPERIENCE_KEYS.map((experience) => <Button key={experience} type="button" variant="outline" onClick={() => setSelectedExperience(experience)} className={`h-11 rounded-xl font-bold ${selectedExperience === experience ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)] hover:text-white" : "border-[var(--brand-border)] bg-white text-[var(--brand-primary)] hover:bg-[var(--brand-panel)]"}`}>{EXPERIENCE_LABELS[experience]}</Button>)}
              </div>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
                <div className="grid gap-4 rounded-2xl border border-[var(--brand-border)] bg-white p-4 sm:grid-cols-2 sm:p-5">
                  {COLOR_FIELDS.map((field) => <ColorField key={field.key} label={field.label} value={form.experiencePalettes[selectedExperience][field.key]} onChange={(value) => setPaletteColor(field.key, value)} />)}
                </div>
                <div className="space-y-4">
                  <PalettePreview palette={form.experiencePalettes[selectedExperience]} label={EXPERIENCE_LABELS[selectedExperience]} />
                  <Button type="button" variant="outline" onClick={restorePalette} className="w-full border-[var(--brand-border)] bg-white font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-panel)]"><RotateCcw />Restaurar paleta predeterminada</Button>
                </div>
              </div>
            </section>
            <section className="border-t border-[var(--brand-border)] pt-7">
              <SectionHeader icon={Images} title="Collage de inicio de sesión" description="Cargá las cuatro imágenes institucionales en formato JPG, PNG o WebP de hasta 5 MB." bordered={false} />
              <div className="grid gap-6 xl:grid-cols-2">
                {form.loginCollageImages.map((url, index) => <div key={index} className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-control)] p-4 sm:p-5">
                  <p className="mb-3 text-sm font-extrabold text-[var(--brand-ink)]">Imagen {index + 1} del collage</p>
                  <ActivityImageUploader value={url} onChange={(value) => setCollageImage(index, value)} endpoint="/general-settings/images" subject={`imagen ${index + 1} del collage`} allowUrl={false} sidePreview />
                </div>)}
              </div>
            </section>
          </div>
        </AdminFormCard>
        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving || form.pageSize < 3 || form.pageSize > 100} className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  </div>;
}

function SectionHeader({ icon: Icon, title, description, bordered = true }: { icon: typeof ListOrdered; title: string; description: string; bordered?: boolean }) {
  return <div className={`mb-4 flex items-start gap-3 pb-4 ${bordered ? "border-b border-[var(--brand-border)]" : ""}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><Icon className="size-5" /></span><div><h3 className="font-extrabold text-[var(--brand-primary)]">{title}</h3><p className="mt-1 text-sm text-[var(--brand-muted)]">{description}</p></div></div>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-2"><span className="text-sm font-extrabold text-[var(--brand-ink)]">{label}</span><span className="flex items-center gap-2"><Input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border-[var(--brand-border)] bg-white p-1" /><Input value={value} maxLength={7} pattern="#[0-9A-Fa-f]{6}" onChange={(event) => onChange(event.target.value)} className={`${adminControlClass} font-mono uppercase`} /></span></label>;
}

function PalettePreview({ palette, label }: { palette: ExperiencePalette; label: string }) {
  return <div style={paletteCssVariables(palette)} className="overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-page)] shadow-sm"><div className="bg-[var(--brand-primary)] p-4 text-white"><p className="text-xs font-bold uppercase tracking-wide text-white/70">Vista previa</p><h4 className="mt-1 text-xl font-extrabold">{label}</h4></div><div className="space-y-3 p-4"><div className="rounded-xl border border-[var(--brand-border)] bg-white p-4"><p className="font-extrabold text-[var(--brand-heading)]">Título del contenido</p><p className="mt-1 text-sm text-[var(--brand-muted)]">Texto informativo de la experiencia.</p></div><Input readOnly value="Control de ejemplo" className={adminControlClass} /><Button type="button" className="w-full bg-[var(--brand-primary)] font-bold text-white hover:bg-[var(--brand-primary-hover)]">Acción principal</Button><span className="inline-flex rounded-full border border-[var(--brand-secondary)] bg-[var(--brand-panel)] px-3 py-1 text-xs font-bold text-[var(--brand-primary)]">Estado de ejemplo</span></div></div>;
}
