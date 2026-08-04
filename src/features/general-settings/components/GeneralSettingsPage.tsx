"use client";

import { useEffect, useState } from "react";
import { Images, ListOrdered, Loader2, Save, Settings2 } from "lucide-react";
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

const initial: GeneralSettings = { pageSize: 6, loginCollageImages: [...AUTH_IMAGES.collage] as GeneralSettings["loginCollageImages"] };

export function GeneralSettingsPage() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const refreshGlobal = useGeneralSettingsRefresh();

  useEffect(() => { void getGeneralSettingsClient().then(setForm).catch((error) => toast.error(getAxiosMessage(error, "No pudimos cargar los parámetros."))).finally(() => setLoading(false)); }, []);

  function setCollageImage(index: number, value: string | null) {
    if (!value) return;
    setForm((current) => ({ ...current, loginCollageImages: current.loginCollageImages.map((url, itemIndex) => itemIndex === index ? value : url) as GeneralSettings["loginCollageImages"] }));
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
