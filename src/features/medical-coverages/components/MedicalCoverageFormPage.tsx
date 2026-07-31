"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  HeartPulse,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { AdminFormPage } from "@/components/layout/admin-form-page";
import {
  AdminFormCard,
  AdminFormField,
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
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ActivityImageUploader } from "@/features/actividades/components/ActivityImageUploader";
import { cn } from "@/lib/utils";
import {
  createMedicalCoverageClient,
  listMedicalCoveragesClient,
  type MedicalCoverage,
  updateMedicalCoverageClient,
} from "../services/medical-coverages.service";

const emptyForm: Omit<MedicalCoverage, "id"> = {
  nombre: "",
  imagenUrl: null,
  tipo: "OBRA_SOCIAL",
  activo: true,
};

export function MedicalCoverageFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    void listMedicalCoveragesClient()
      .then((items) => {
        const coverage = items.find((item) => item.id === id);
        if (!coverage) {
          toast.error("No encontramos la cobertura seleccionada.");
          router.replace("/medical-coverages");
          return;
        }
        setForm({
          nombre: coverage.nombre,
          imagenUrl: coverage.imagenUrl,
          tipo: coverage.tipo,
          activo: coverage.activo,
        });
      })
      .catch(() => {
        toast.error("No pudimos cargar la cobertura médica.");
        router.replace("/medical-coverages");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("Ingresá el nombre de la cobertura.");
      return;
    }
    setSaving(true);
    try {
      const saved = id
        ? await updateMedicalCoverageClient(id, form)
        : await createMedicalCoverageClient(form);
      toast.success(id ? "Cobertura actualizada." : "Cobertura creada.");
      router.replace(`/medical-coverages?selected=${saved.id}`);
    } catch {
      toast.error("No pudimos guardar la cobertura.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <CatalogLoadingState label="la cobertura médica" fullPage />;
  }

  return (
    <AdminFormPage
      title={id ? "Editar cobertura médica" : "Nueva cobertura médica"}
      description={
        id
          ? "Actualizá la obra social o prepaga seleccionada."
          : "Completá los datos para incorporar una cobertura al catálogo."
      }
      icon={HeartPulse}
      fullWidth
    >
      <form onSubmit={save} className="w-full text-[var(--brand-ink)]">
        <AdminFormCard
          title="Datos de la cobertura"
          description="Esta información estará disponible en el alta y perfil de los usuarios."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-extrabold text-[var(--brand-ink)]">Avatar de la cobertura</p>
              <ActivityImageUploader value={form.imagenUrl} onChange={(imagenUrl) => setForm((current) => ({ ...current, imagenUrl }))} endpoint="/medical-coverages/images" subject="obra social" maxDimension={512} allowUrl={false} sidePreview />
            </div>
            <AdminFormField label="Nombre *" icon={HeartPulse}>
              <Input
                value={form.nombre}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }))
                }
                className={adminControlClass}
                placeholder="Ej.: OSDE, IOMA, Swiss Medical"
              />
            </AdminFormField>

            <AdminFormField label="Tipo *" icon={ShieldCheck}>
              <Select
                value={form.tipo}
                onValueChange={(tipo) =>
                  setForm((current) => ({
                    ...current,
                    tipo: tipo as MedicalCoverage["tipo"],
                  }))
                }
              >
                <SelectTrigger className={cn(adminControlClass, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OBRA_SOCIAL">Obra social</SelectItem>
                  <SelectItem value="PREPAGA">Prepaga</SelectItem>
                </SelectContent>
              </Select>
            </AdminFormField>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="font-extrabold text-[var(--brand-ink)]">
                Estado
              </Label>
              <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-control)] px-4">
                <div className="flex items-center gap-3">
                  <Building2 className="size-5 text-[var(--brand-primary)]" />
                  <div>
                    <p className="font-bold text-[var(--brand-ink)]">
                      Cobertura {form.activo ? "activa" : "inactiva"}
                    </p>
                    <p className="text-xs text-[var(--brand-muted)]">
                      {form.activo
                        ? "Puede seleccionarse en los formularios de usuarios."
                        : "No estará disponible para nuevas selecciones."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.activo}
                  onCheckedChange={(activo) =>
                    setForm((current) => ({ ...current, activo }))
                  }
                />
              </div>
            </div>
          </div>
        </AdminFormCard>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/medical-coverages")}
            className={adminSecondaryButtonClass}
          >
            <ArrowLeft /> Volver
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className={cn(adminPrimaryButtonClass, "min-w-48")}
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {id ? "Guardar cambios" : "Crear cobertura"}
          </Button>
        </div>
      </form>
    </AdminFormPage>
  );
}
