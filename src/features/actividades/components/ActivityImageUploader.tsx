"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { axiosInstance } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { ImageUploadColumns } from "@/components/shared/image-upload-layout";

import { ActivityImagePreview } from "./ActivityImagePreview";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function ActivityImageUploader({ value, onChange, endpoint = "/activities/images", subject = "actividad", maxDimension, allowUrl = true, sidePreview = true }: { value: string | null; onChange: (url: string | null) => void; endpoint?: string; subject?: string; maxDimension?: number; allowUrl?: boolean; sidePreview?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG, PNG o WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("La imagen debe pesar menos de 5 MB.");
      return;
    }
    if (maxDimension) {
      const dimensions = await readImageDimensions(file);
      if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
        toast.error(`La imagen no puede superar ${maxDimension} × ${maxDimension} píxeles.`);
        return;
      }
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await axiosInstance.post<{ data: { publicUrl: string } }>(endpoint, form);
      onChange(response.data.data.publicUrl);
      toast.success("Imagen cargada correctamente.");
    } catch {
      toast.error("No pudimos subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {allowUrl ? <Input
        id="activity-image"
        className="rounded-xl border-[#C9D9C3] bg-[#F7FBF5] text-[#173C2A]"
        placeholder="URL de la imagen"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      /> : null}
      <ImageUploadColumns enabled={sidePreview} className={sidePreview ? "sm:grid-cols-[minmax(0,1fr)_minmax(132px,0.45fr)]" : undefined}>
      <div
        className={cn(
          "grid min-h-44 cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-4 text-center transition",
          dragging ? "border-[#1D4F36] bg-[#DDEED2]" : "border-[#819B56] bg-[#F7FBF5] hover:bg-[#EEF6E9]",
          uploading && "pointer-events-none opacity-65",
        )}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }}
      >
        <div>
          {uploading ? <Loader2 className="mx-auto size-9 animate-spin text-[#1D4F36]" /> : <UploadCloud className="mx-auto size-10 text-[#1D4F36]" />}
          <p className="mt-2 font-extrabold text-[#1D4F36]">{uploading ? "Subiendo imagen..." : "Arrastrá una imagen acá"}</p>
          <p className="mt-1 text-xs font-medium text-[#5F6F68]">JPG, PNG o WebP · máximo 5 MB{maxDimension ? ` · hasta ${maxDimension} × ${maxDimension} px` : ""}</p>
          <Button type="button" variant="outline" disabled={uploading} className="mt-3 rounded-xl border-[#819B56] bg-white font-bold text-[#1D4F36]" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}><ImageUp />Seleccionar imagen</Button>
        </div>
      </div>
      {sidePreview ? (
        value ? <div className="grid min-h-44 place-items-center rounded-2xl border border-[#819B56]/25 bg-[#F7FBF5] p-3"><ActivityImagePreview source={value} alt={`Vista previa de ${subject}`} className="size-36 max-h-full max-w-full object-contain p-1 sm:size-40" /></div> : <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-[#819B56]/45 bg-[#F7FBF5] p-5 text-center text-sm font-bold text-[#5F6F68]">La imagen cargada se mostrará acá.</div>
      ) : null}
      </ImageUploadColumns>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      {!sidePreview && value ? <ActivityImagePreview source={value} alt={`Vista previa de ${subject}`} className="h-44 w-full" /> : null}
    </div>
  );
}

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { reject(new Error("INVALID_IMAGE")); URL.revokeObjectURL(url); };
    image.src = url;
  });
}
