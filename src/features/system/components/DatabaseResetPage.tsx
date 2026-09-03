"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, DatabaseZap, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogLoadingState, CatalogPageHeader } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { axiosInstance } from "@/lib/axios";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import { DATABASE_RESET_CONFIRMATION, type DatabaseResetPreview } from "../services/database-reset.constants";

export function DatabaseResetPage() {
  const [preview, setPreview] = useState<DatabaseResetPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    void axiosInstance.get<{ data: DatabaseResetPreview }>("/system/data-reset")
      .then(({ data }) => setPreview(data.data))
      .catch((error) => toast.error(getAxiosMessage(error, "No pudimos cargar el resumen.")))
      .finally(() => setLoading(false));
  }, []);

  async function reset() {
    if (!preview) return;
    setProcessing(true);
    try {
      await axiosInstance.post("/system/data-reset", { email, confirmation });
      toast.success("La base quedó preparada para comenzar las pruebas desde cero.");
      window.location.assign("/");
    } catch (error) {
      toast.error(getAxiosMessage(error, "No pudimos reiniciar los datos."));
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <CatalogLoadingState label="datos de prueba" fullPage />;

  return (
    <main className="min-h-full bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
      <CatalogPageHeader icon={DatabaseZap} title="Datos de prueba" description="Reiniciá la información funcional para comenzar una prueba desde cero." total={preview ? 1 : 0} />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,.72fr)]">
        <section className="rounded-3xl border border-[#DDE8D7] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><AlertTriangle /></span><div><h2 className="text-xl font-extrabold text-[#1D4F36]">Información que será eliminada</h2><p className="mt-1 text-sm leading-6 text-[#5F6F68]">La acción es irreversible y elimina todos los datos operativos. No elimina las migraciones ni la configuración de seguridad base.</p></div></div>
          {preview ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
            ["Usuarios", preview.users], ["Actividades", preview.activities], ["Establecimientos", preview.establishments],
            ["Profesores", preview.professors], ["Inscripciones", preview.enrollments], ["Clases", preview.sessions],
            ["Documentos", preview.personalDocuments], ["Notificaciones", preview.notifications], ["Auditorías", preview.auditRecords],
          ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[#DDE8D7] bg-[#F1F5EC] p-4"><p className="text-2xl font-extrabold text-[#1D4F36]">{value}</p><p className="text-sm font-bold text-[#5F6F68]">{label}</p></div>)}</div> : <p className="mt-6 rounded-2xl bg-red-50 p-4 text-red-700">No pudimos obtener la vista previa.</p>}
        </section>

        <aside className="rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-6 shadow-sm">
          <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-6 text-[#1D4F36]" /><div><h2 className="text-xl font-extrabold text-[#1D4F36]">Confirmación administrativa</h2><p className="mt-1 text-sm leading-6 text-[#5F6F68]">Se conservarán tu usuario administrador, los roles base y todos los permisos.</p></div></div>
          <div className="mt-6 grid gap-5">
            <label className="grid gap-2 text-sm font-bold text-[#1D4F36]">Correo del administrador<Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={preview?.adminEmail} className="h-12 rounded-xl border-[#C9D9C3] bg-white" /></label>
            <label className="grid gap-2 text-sm font-bold text-[#1D4F36]">Escribí “{DATABASE_RESET_CONFIRMATION}”<Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 rounded-xl border-[#C9D9C3] bg-white" /></label>
          </div>
          <div className="mt-6 border-t border-[#C9D9C3] pt-6"><Button type="button" disabled={!preview || processing || email.trim().toLowerCase() !== preview.adminEmail.toLowerCase() || confirmation !== DATABASE_RESET_CONFIRMATION} onClick={() => void reset()} className="h-12 w-full rounded-xl bg-red-700 font-bold text-white hover:bg-red-800">{processing ? <Loader2 className="animate-spin" /> : <DatabaseZap />}Reiniciar datos de prueba</Button></div>
        </aside>
      </div>
    </main>
  );
}
