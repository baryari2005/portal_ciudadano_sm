"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  CircleFadingArrowUp,
  Loader2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/stores/auth";
import { ReceiptType, SplitStats } from "../types/types";

type UploadedFileResponse = {
  url: string;
  path: string;
  name: string;
  size: number;
  error?: string;
};

type ErrorResponse = {
  error?: string;
};

function isReceiptType(value: string): value is ReceiptType {
  return ["SALARIO", "VACACIONES", "AGUINALDO", "BONO"].includes(value);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function parseJson<T>(text: string): T | null {
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function PdfUploader({
  onUploaded,
}: {
  onUploaded?: (file: UploadedFileResponse) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [period, setPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7),
  );
  const [stats, setStats] = useState<SplitStats | null>(null);
  const [receiptType, setReceiptType] = useState<ReceiptType>("SALARIO");

  const { token } = useAuth();

  const pick = () => inputRef.current?.click();

  const selectFile = (nextFile: File | null) => {
    if (!nextFile) return;

    const isPdf =
      nextFile.type === "application/pdf" ||
      nextFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      toast.error("Solo se permiten archivos PDF.");
      return;
    }

    if (nextFile.size > 16 * 1024 * 1024) {
      toast.error("Maximo 16MB");
      return;
    }

    setFile(nextFile);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  };

  const upload = async () => {
    if (!file) return;

    if (!token) {
      toast.error("No tenes sesion iniciada.");
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      toast.error("Maximo 16MB");
      return;
    }

    setUploading(true);
    setStats(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/admin/upload-pdf", {
        method: "POST",
        body: fd,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const uploadTxt = await res.text();
      const uploadData = parseJson<UploadedFileResponse & ErrorResponse>(
        uploadTxt,
      );

      if (!res.ok) {
        throw new Error(uploadData?.error || "Error subiendo PDF");
      }

      if (!uploadData?.path || !uploadData?.url) {
        throw new Error("La respuesta de upload es invalida");
      }

      toast.success("PDF subido correctamente");
      onUploaded?.(uploadData);

      const splitMsg = toast.loading(`Procesando periodo ${period}...`);

      const splitRes = await fetch("/api/admin/payroll/split", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          path: uploadData.path,
          period,
          receiptType,
        }),
      });

      const splitTxt = await splitRes.text();
      const splitData = parseJson<SplitStats & ErrorResponse>(splitTxt);

      if (!splitRes.ok) {
        throw new Error(splitData?.error || "Error procesando PDF");
      }

      if (!splitData) {
        throw new Error("La respuesta del procesamiento es invalida");
      }

      setStats(splitData);

      toast.success(
        `OK: CUIL detectados ${splitData.uniqueCuils}, subidos ${splitData.uploaded} (en ${Math.round(splitData.durationMs)} ms).`,
        { id: splitMsg },
      );

      setFile(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Error en la carga/procesamiento"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center text-2xl">
            <CircleFadingArrowUp className="mr-2" />
            Subir PDF de recibos
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>
              Periodo
              <p className="text-xs text-muted-foreground">Formato YYYY-MM.</p>
            </Label>

            <div className="flex gap-2">
              <Input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="YYYY-MM"
                className="h-11 rounded border pr-3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de recibo</Label>

            <Select
              value={receiptType}
              onValueChange={(value) => {
                if (isReceiptType(value)) {
                  setReceiptType(value);
                }
              }}
            >
              <SelectTrigger className="h-11 w-full rounded border">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="SALARIO">Recibo de sueldo</SelectItem>
                <SelectItem value="VACACIONES">Vacaciones</SelectItem>
                <SelectItem value="AGUINALDO">Aguinaldo</SelectItem>
                <SelectItem value="BONO">Bono</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Archivo PDF
              <p className="text-xs text-muted-foreground">
                Formato PDF, max. 16MB
              </p>
            </Label>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "rounded-xl border border-dashed p-4 transition-colors",
                isDragging
                  ? "border-[#008C93] bg-[#008C93]/5"
                  : "border-slate-300 bg-slate-50",
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">
                    Arrastra y suelta el PDF aqui
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tambien puedes seleccionarlo manualmente desde el boton.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {file
                      ? `Archivo seleccionado: ${file.name}`
                      : "Ningun archivo seleccionado"}
                  </p>
                </div>

                <Button
                  type="button"
                  className="h-11 rounded bg-[#008C93] hover:bg-[#007381]"
                  onClick={pick}
                >
                  <Upload className="h-4 w-4" />
                  Elegir archivo
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={upload}
              disabled={!file || uploading || !/^\d{4}-\d{2}$/.test(period)}
              className="h-11 w-full rounded bg-[#008C93] hover:bg-[#007381]"
            >
              {uploading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Subiendo y procesando...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Subir y procesar recibos
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {stats && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="text-sm font-medium">Resumen del procesamiento</div>

            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <Stat label="Periodo" value={stats.period} />
              <Stat label="Paginas totales" value={stats.totalPages} />
              <Stat
                label="Paginas con CUIL"
                value={stats.detectedPagesWithCuil}
              />
              <Stat label="CUIL unicos" value={stats.uniqueCuils} />
              <Stat label="Archivos subidos" value={stats.uploaded} />
              <Stat label="Duplicados (CUIL)" value={stats.duplicates.count} />
              <Stat label="Paginas sin CUIL" value={stats.unmatched.count} />
              <Stat
                label="Tiempo"
                value={`${Math.round(stats.durationMs)} ms`}
              />
            </div>

            {stats.duplicates.count > 0 && (
              <div className="text-xs text-muted-foreground">
                Duplicados (muestra): {stats.duplicates.cuils.join(", ")}
              </div>
            )}

            {stats.sampleCuils?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                CUIL detectados (muestra):{" "}
                {stats.sampleCuils.slice(0, 10).join(", ")}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Carpeta destino:{" "}
              <span className="font-mono">{stats.prefixPath}</span> (bucket:{" "}
              <span className="font-mono">{stats.bucket}</span>)
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}
