"use client";

import { useEffect, useState } from "react";
import { ListOrdered, Loader2, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";

import {
  AdminDetailActions,
  AdminFormCard,
  AdminFormField,
  AdminPageShell,
  adminControlClass,
  adminPrimaryButtonClass,
} from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CatalogLoadingState,
  CatalogPageHeader,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { RequestAccessPhotoField } from "@/features/auth/request-access/components/RequestAccessPhotoField";
import { AUTH_IMAGES } from "@/features/auth/constants/auth-theme";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";

import {
  getGeneralSettingsClient,
  updateGeneralSettingsClient,
} from "../services/general-settings.service";
import type { GeneralSettings } from "../types/general-settings.types";
import { useGeneralSettingsRefresh } from "./GeneralSettingsProvider";

const initial: GeneralSettings = {
  pageSize: 6,
  loginCollageImages: [...AUTH_IMAGES.collage] as GeneralSettings["loginCollageImages"],
};

export function GeneralSettingsPage() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const refreshGlobal = useGeneralSettingsRefresh();

  useEffect(() => {
    void getGeneralSettingsClient()
      .then(setForm)
      .catch((error) => toast.error(getAxiosMessage(error, "No pudimos cargar los parámetros.")))
      .finally(() => setLoading(false));
  }, []);

  function setCollageImage(index: number, value: string | null) {
    if (!value) return;
    setForm((current) => ({
      ...current,
      loginCollageImages: current.loginCollageImages.map((url, itemIndex) =>
        itemIndex === index ? value : url,
      ) as GeneralSettings["loginCollageImages"],
    }));
  }

  async function save() {
    setSaving(true);
    try {
      setForm(await updateGeneralSettingsClient(form));
      await refreshGlobal();
      toast.success("Parámetros generales guardados.");
    } catch (error) {
      toast.error(getAxiosMessage(error, "No pudimos guardar los parámetros."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <CatalogLoadingState label="parámetros generales" fullPage />;

  return (
    <AdminPageShell>
      <CatalogPageHeader
        icon={Settings2}
        title="Parámetros generales"
        description="Administrá valores transversales de la experiencia y la identidad visual del acceso."
        total={1}
      />

      <div className="mt-6 grid gap-6">
        <AdminFormCard
          title="Listados administrativos"
          description="Definí la cantidad de elementos visibles en las pantallas que utilizan el paginado compartido."
        >
          <AdminFormField label="Registros por página" icon={ListOrdered} className="max-w-md">
            <Input
              type="number"
              min={3}
              max={100}
              value={form.pageSize}
              onChange={(event) => setForm((current) => ({ ...current, pageSize: Number(event.target.value) }))}
              className={adminControlClass}
            />
          </AdminFormField>
        </AdminFormCard>

        <AdminFormCard
          title="Collage de inicio de sesión"
          description="Cargá las cuatro imágenes institucionales. Se admiten archivos JPG, PNG o WebP de hasta 5 MB."
        >
          <div className="grid gap-6 xl:grid-cols-2">
            {form.loginCollageImages.map((url, index) => (
              <RequestAccessPhotoField
                key={index}
                currentUrl={url}
                title={`Imagen ${index + 1} del collage`}
                description="Imagen institucional visible en la pantalla de inicio de sesión."
                uploadEndpoint="/api/general-settings/images"
                allowCamera={false}
                allowClear={false}
                sidePreview
                onUploaded={({ publicUrl }) => setCollageImage(index, publicUrl)}
                onClear={() => undefined}
              />
            ))}
          </div>
        </AdminFormCard>

        <AdminDetailActions className="justify-end sm:[&>*]:flex-none">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || form.pageSize < 3 || form.pageSize > 100}
            className={adminPrimaryButtonClass}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar cambios
          </Button>
        </AdminDetailActions>
      </div>
    </AdminPageShell>
  );
}
