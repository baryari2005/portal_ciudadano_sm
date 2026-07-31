"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileCheck2, FileText, Loader2, MessageSquareText, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { AdminFormPage } from "@/components/layout/admin-form-page";
import { PersonSearchSelector, type PersonSearchOption } from "@/components/shared/PersonSearchSelector";
import { AdminFormCard, AdminFormField, adminControlClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ENROLLMENT_DOCUMENT_BYTES } from "@/features/enrollment-documents/constants/file-rules";
import { listRequirementsClient } from "@/features/requirements/services/requirements.service";
import type { Requirement } from "@/features/requirements/types/requirement.types";
import { axiosInstance } from "@/lib/axios";

type Citizen = PersonSearchOption & { email?: string | null; identityPhotoUrl?: string | null; phone?: string | null; address?: string | null; locality?: string | null; province?: string | null; postalCode?: string | null; birthDate?: string | null };

const searchCitizens = async (query: string) => (await axiosInstance.get("/user-documents/citizens", { params: { q: query } })).data.data.items as Citizen[];
const identifyCitizen = async (qrToken: string) => (await axiosInstance.post("/user-documents/citizens", { qrToken })).data.data as Citizen;

export function AdminUserDocumentUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [requirementId, setRequirementId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    void listRequirementsClient({ active: true, requiresDocument: true, orderBy: "orden", orderDir: "asc" })
      .then((items) => setRequirements(items.filter((item) => item.documentoPersonal)))
      .catch(() => toast.error("No pudimos cargar los tipos de documento."))
      .finally(() => setLoadingOptions(false));
  }, []);

  function choose(next?: File) {
    if (!next) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(next.type)) return void toast.error("Solo se permiten archivos PDF, JPG o PNG.");
    if (next.size > MAX_ENROLLMENT_DOCUMENT_BYTES) return void toast.error("El archivo supera el máximo de 10 MB.");
    setFile(next);
  }

  async function submit() {
    if (!citizen || !requirementId || !file || loading) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.set("userId", citizen.id);
      form.set("requirementId", requirementId);
      form.set("file", file);
      form.set("observations", observations);
      await axiosInstance.post("/user-documents", form);
      toast.success("Documento cargado y enviado a revisión.");
      router.replace("/user-documents");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "No pudimos cargar el documento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminFormPage fullWidth title="Cargar documento presentado" description="Registrá el archivo que el ciudadano entregó presencialmente en administración." icon={FileText}>
      <AdminFormCard title="Datos del documento" description="Seleccioná al ciudadano, el tipo documental y el archivo entregado.">
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
          <PersonSearchSelector value={citizen} onChange={setCitizen} search={searchCitizens} identifyQr={identifyCitizen} />
          </div>
          {citizen ? <>
            <AdminFormField label="Tipo de documento *" icon={FileCheck2} className="sm:col-span-2">
              <Select value={requirementId} onValueChange={setRequirementId} disabled={loadingOptions}>
                <SelectTrigger className={`${adminControlClass} w-full`}><SelectValue placeholder={loadingOptions ? "Cargando tipos de documento..." : "Seleccionar tipo documental"} /></SelectTrigger>
                <SelectContent>{requirements.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </AdminFormField>
            <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files[0]); }} className={`grid min-h-48 place-items-center rounded-2xl border border-dashed p-6 text-center transition sm:col-span-2 ${dragging ? "border-[var(--brand-primary)] bg-[var(--brand-panel)]" : "border-[var(--brand-secondary)]/60 bg-[var(--brand-control)]"}`}>
              <div><UploadCloud className="mx-auto size-10 text-[var(--brand-secondary)]" /><p className="mt-2 font-extrabold text-[var(--brand-primary)]">{file ? file.name : "Arrastrá el documento acá"}</p><p className="mt-1 text-xs text-[var(--brand-muted)]">PDF, JPG o PNG · máximo 10 MB</p><Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={() => inputRef.current?.click()}>Seleccionar archivo</Button><input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(event) => { choose(event.target.files?.[0]); event.target.value = ""; }} /></div>
            </div>
            <AdminFormField label="Observaciones administrativas" icon={MessageSquareText} align="start" className="sm:col-span-2"><Textarea value={observations} onChange={(event) => setObservations(event.target.value)} rows={5} maxLength={1000} className="min-h-32 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)]" placeholder="Indicá cómo fue presentado o cualquier dato relevante..." /></AdminFormField>
          </> : null}
        </div>
        <footer className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--brand-border)] pt-5 sm:flex-row sm:justify-between">
          <Button asChild variant="outline" className={adminSecondaryButtonClass}><Link href="/user-documents"><ArrowLeft />Cancelar</Link></Button>
          <Button type="button" className={adminPrimaryButtonClass} disabled={loading || !citizen || !requirementId || !file} onClick={() => void submit()}>{loading ? <Loader2 className="animate-spin" /> : <UploadCloud />}{loading ? "Cargando..." : "Cargar documento"}</Button>
        </footer>
      </AdminFormCard>
    </AdminFormPage>
  );
}
