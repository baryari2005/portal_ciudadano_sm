"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Download,
  FileCheck2,
  FileClock,
  FileUp,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { CitizenHeader } from "@/features/citizen/components/CitizenPrimitives";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { AdminDetailHeader, AdminDetailPanel } from "@/components/shared/admin-patterns";

type Doc = {
  id: string;
  status: string;
  originalName: string;
  uploadedAt: string;
  rejectionReason: string | null;
  expiresAt: string | null;
  validity: "SIN_VENCIMIENTO" | "VIGENTE" | "PROXIMO_A_VENCER" | "VENCIDO";
};

type Requirement = {
  id: string;
  name: string;
  instructions: string | null;
  current: Doc | null;
};

type StatusFilter = "all" | "missing" | "PENDIENTE" | "APROBADO" | "RECHAZADO";

const statusText: Record<string, string> = {
  missing: "Pendiente de carga",
  PENDIENTE: "En revisión",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  PROXIMO_A_VENCER: "Próximo a vencer",
  VENCIDO: "Vencido",
};

export function CitizenDocumentsPage() {
  const [items, setItems] = useState<Requirement[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await axiosInstance.get("/citizen/documents");
    const requirements = response.data.data.requirements as Requirement[];
    setItems(requirements);
    setSelectedId((current) =>
      current && requirements.some((item) => item.id === current)
        ? current
        : requirements[0]?.id ?? "",
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const currentStatus = item.current?.status ?? "missing";
      return (
        (status === "all" || currentStatus === status) &&
        (!normalizedQuery ||
          `${item.name} ${item.instructions ?? ""}`.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [items, query, status]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  async function upload(requirementId: string, file?: File) {
    if (!file) return;
    setUploading(requirementId);
    try {
      const form = new FormData();
      form.set("requirementId", requirementId);
      form.set("file", file);
      await axiosInstance.post("/citizen/documents", form);
      await load();
      toast.success("Documento enviado a revisión.");
    } catch {
      toast.error("No pudimos subir el documento.");
    } finally {
      setUploading(null);
    }
  }

  async function download(id: string) {
    const response = await axiosInstance.get(`/citizen/documents/${id}/download`);
    window.open(response.data.data.url, "_blank", "noopener,noreferrer");
  }

  if (loading) return <CatalogLoadingState label="documentos" fullPage />;

  return (
    <main className="min-h-full bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
      <CitizenHeader
        title="Mis documentos"
        description="Completá la documentación requerida y consultá su estado."
      />

      <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
        <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar documento requerido..." />
            <CatalogFilterPopover
              sections={[{
                id: "document-status",
                title: "Estado",
                value: status,
                options: [
                  { value: "all", label: "Todos" },
                  { value: "missing", label: "Pendientes de carga" },
                  { value: "PENDIENTE", label: "En revisión" },
                  { value: "APROBADO", label: "Aprobados" },
                  { value: "RECHAZADO", label: "Rechazados" },
                ],
                onChange: (value) => setStatus(value as StatusFilter),
              }]}
            />
          </div>

          <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-290px)]">
            {filtered.map((item) => {
              const currentStatus = documentDisplayStatus(item.current);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#819B56]",
                    selectedId === item.id
                      ? "border-[#1D4F36] bg-[#EEF6E9] shadow-sm"
                      : "border-[#DDE8D7] bg-white hover:border-[#819B56] hover:shadow-sm",
                  )}
                  data-admin-list-card=""
                >
                  <DocumentIcon status={currentStatus} />
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold text-[#173C2A]">{item.name}</span>
                    <StatusPill status={currentStatus} />
                    <span className="mt-2 line-clamp-1 block text-xs font-semibold text-[#315644]/65">
                      {item.current?.originalName ?? "Todavía no adjuntaste un archivo"}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-[#819B56]" />
                </button>
              );
            })}
            {!filtered.length ? <CatalogEmptyState title="No hay documentos requeridos." description="Los tipos de documento solicitados aparecerán en este listado." filtered={Boolean(query.trim()) || status !== "all"} /> : null}
          </div>
        </div>

        <div className={cn(!selectedId && "hidden lg:block")}>
          <DocumentDetail
            item={selected}
            uploading={uploading === selected?.id}
            onBack={() => setSelectedId("")}
            onUpload={upload}
            onDownload={download}
          />
        </div>
      </section>
    </main>
  );
}

function DocumentDetail({
  item,
  uploading,
  onBack,
  onUpload,
  onDownload,
}: {
  item: Requirement | null;
  uploading: boolean;
  onBack: () => void;
  onUpload: (requirementId: string, file?: File) => Promise<void>;
  onDownload: (id: string) => Promise<void>;
}) {
  if (!item) {
    return (
      <aside className="hidden min-h-72 items-center justify-center rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-8 text-center text-sm font-semibold text-[#315644]/70 lg:flex">
        Seleccioná un documento para consultar su detalle.
      </aside>
    );
  }

  const currentStatus = documentDisplayStatus(item.current);
  const canUpload = !item.current || item.current.status === "RECHAZADO";

  return (
    <AdminDetailPanel onBack={onBack} empty="Seleccioná un documento.">
      <AdminDetailHeader title={item.name} leading={<DocumentIcon status={currentStatus} large />} badge={<StatusPill status={currentStatus} />} />

      <div className="mt-6 rounded-2xl border border-[#C9D9C3] bg-white p-4">
        <p className="text-xs font-extrabold uppercase text-[#819B56]">Indicaciones</p>
        <p className="mt-1 text-sm font-medium text-[#315644]">
          {item.instructions || "Adjuntá un archivo PDF, JPG o PNG de hasta 10 MB."}
        </p>
      </div>

      {item.current ? (
        <div className="mt-4 rounded-2xl border border-[#C9D9C3] bg-white p-4">
          <p className="text-xs font-extrabold uppercase text-[#819B56]">Archivo presentado</p>
          <p className="mt-2 break-all font-bold text-[#173C2A]">{item.current.originalName}</p>
          {item.current.expiresAt ? (
            <p className="mt-2 text-sm font-semibold text-[#315644]">
              Vencimiento: {new Date(item.current.expiresAt).toLocaleDateString("es-AR", { timeZone: "UTC" })}
            </p>
          ) : null}
          {item.current.rejectionReason ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <strong>Motivo del rechazo:</strong> {item.current.rejectionReason}
            </div>
          ) : null}
          <Button
            variant="outline"
            className="mt-4 h-11 rounded-xl border-[#819B56] bg-white font-bold text-[#1D4F36] hover:bg-[#EEF6E9]"
            onClick={() => void onDownload(item.current!.id)}
          >
            <Download /> Ver archivo
          </Button>
        </div>
      ) : null}

      {canUpload ? (
        <DocumentDropzone
          disabled={uploading}
          replacement={Boolean(item.current)}
          onFile={(file) => void onUpload(item.id, file)}
        />
      ) : (
        <p className="mt-5 rounded-2xl border border-[#C9D9C3] bg-[#DDEED2] p-4 text-center text-sm font-bold text-[#1D4F36]">
          {item.current?.status === "PENDIENTE"
            ? "El documento está siendo revisado."
            : "El documento fue aprobado y no requiere otra carga."}
        </p>
      )}
    </AdminDetailPanel>
  );
}

function DocumentDropzone({ disabled, replacement, onFile }: { disabled: boolean; replacement: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={cn(
        "mt-5 grid min-h-52 place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition",
        dragging ? "border-[#1D4F36] bg-[#DDEED2]" : "border-[#819B56] bg-white/80",
        disabled && "cursor-not-allowed opacity-60",
      )}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) onFile(event.dataTransfer.files[0]);
      }}
    >
      <div>
        {disabled ? <Loader2 className="mx-auto size-10 animate-spin text-[#1D4F36]" /> : <UploadCloud className="mx-auto size-11 text-[#1D4F36]" />}
        <p className="mt-3 font-extrabold text-[#1D4F36]">
          {disabled ? "Subiendo documento..." : "Arrastrá y soltá el archivo acá"}
        </p>
        <p className="mt-1 text-sm text-[#5F6F68]">PDF, JPG o PNG · máximo 10 MB</p>
        <Input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          disabled={disabled}
          className="mt-4 h-11 rounded-xl bg-[#1D4F36] px-5 font-bold hover:bg-[#143A27]"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp /> {replacement ? "Adjuntar nueva versión" : "Seleccionar archivo"}
        </Button>
      </div>
    </div>
  );
}

function DocumentIcon({ status, large = false }: { status: string; large?: boolean }) {
  const Icon = status === "APROBADO" ? CheckCircle2 : status === "RECHAZADO" ? XCircle : status === "PENDIENTE" ? FileClock : FileCheck2;
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-xl bg-[#1D4F36] text-white shadow-sm", large ? "size-16 rounded-2xl" : "size-12")}>
      <Icon className={large ? "size-8" : "size-6"} />
    </span>
  );
}

function documentDisplayStatus(document: Doc | null) {
  if (!document) return "missing";
  if (document.status === "APROBADO" && ["PROXIMO_A_VENCER", "VENCIDO"].includes(document.validity)) {
    return document.validity;
  }
  return document.status;
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn(
      "mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase",
      status === "APROBADO" && "bg-[#DDEED2] text-[#1D4F36]",
      status === "RECHAZADO" && "bg-red-100 text-red-800",
      status === "PENDIENTE" && "bg-amber-100 text-amber-900",
      status === "PROXIMO_A_VENCER" && "bg-amber-100 text-amber-900",
      status === "VENCIDO" && "bg-orange-100 text-orange-900",
      status === "missing" && "bg-[#EEF1EC] text-[#5F6F68]",
    )}>
      {statusText[status] ?? status}
    </span>
  );
}
