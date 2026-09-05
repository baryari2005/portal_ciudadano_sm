"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageUploadColumns } from "@/components/shared/image-upload-layout";
import { axiosInstance } from "@/lib/axios";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";

type RequestAccessPhotoFieldProps = {
  disabled?: boolean;
  currentUrl?: string | null;
  onUploaded: (payload: { tmpPath: string; publicUrl: string }) => void;
  onClear: () => void;
  allowClear?: boolean;
  title?: string;
  description?: string;
  allowCamera?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
  sidePreview?: boolean;
  uploadEndpoint?: string;
};

const MAX_KB = 200;
const MAX_SIDE = 512;
const MIN_SIZE = 128;

const toDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function imageToJpegFile(image: HTMLImageElement) {
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No pudimos procesar la imagen.");
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.9;
  let blob: Blob | null = null;

  while (quality >= 0.6) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    if (blob && blob.size <= MAX_KB * 1024) {
      break;
    }

    quality -= 0.05;
  }

  if (!blob) {
    throw new Error("No pudimos preparar la imagen.");
  }

  return new File([blob], "foto-perfil.jpg", { type: "image/jpeg" });
}

export function RequestAccessPhotoField({
  disabled,
  currentUrl,
  onUploaded,
  onClear,
  allowClear = true,
  title = "Foto de identidad",
  description = "Podés subir una imagen o tomar una foto con la cámara.",
  allowCamera = true,
  onUploadingChange,
  sidePreview = true,
  uploadEndpoint = "/api/media/avatars/upload",
}: RequestAccessPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    setPreviewUrl(currentUrl ?? null);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    const markReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setCameraReady(true);
      }
    };

    video.addEventListener("loadedmetadata", markReady);
    video.addEventListener("canplay", markReady);

    void video
      .play()
      .then(markReady)
      .catch(() => {
        toast.error("No pudimos iniciar la vista previa de la cámara.");
      });

    return () => {
      video.removeEventListener("loadedmetadata", markReady);
      video.removeEventListener("canplay", markReady);
      video.srcObject = null;
    };
  }, [cameraOpen]);

  async function uploadPhoto(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Solo se permiten imágenes JPG o PNG.");
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);

    try {
      const dataUrl = await toDataURL(file);
      const image = await loadImage(dataUrl);

      if (image.width < MIN_SIZE || image.height < MIN_SIZE) {
        toast.error(`La imagen debe medir al menos ${MIN_SIZE}x${MIN_SIZE}px.`);
        return;
      }

      const compressedFile = await imageToJpegFile(image);
      const formData = new FormData();
      formData.append("file", compressedFile);

      const endpoint = uploadEndpoint.replace(/^\/api(?=\/)/, "");
      const response = await axiosInstance.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        skipAuthRedirect: true,
      });
      const responseData = response.data as {
        tmpPath?: string;
        publicUrl?: string;
        data?: { path?: string; tmpPath?: string; publicUrl?: string };
        error?: string;
        message?: string;
      } | null;
      const data = responseData?.data
        ? {
            tmpPath: responseData.data.tmpPath ?? responseData.data.path,
            publicUrl: responseData.data.publicUrl,
          }
        : {
            tmpPath: responseData?.tmpPath,
            publicUrl: responseData?.publicUrl,
          };

      if (!data.publicUrl) {
        throw new Error(responseData?.error || responseData?.message || "No pudimos subir la foto.");
      }

      setPreviewUrl(data.publicUrl);
      onUploaded({ tmpPath: data.tmpPath ?? data.publicUrl, publicUrl: data.publicUrl });
      toast.success("Foto cargada correctamente.");
    } catch (error) {
      toast.error(error instanceof Error && !error.name.includes("Axios") ? error.message : getAxiosMessage(error, "No pudimos cargar la foto."));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  }

  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Este navegador no permite usar la cámara.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      setCameraReady(false);
      setCameraOpen(true);
    } catch {
      toast.error("No pudimos acceder a la cámara.");
    }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    setCameraOpen(false);
  }

  async function capturePhoto() {
    const video = videoRef.current;

    if (
      !video ||
      !cameraReady ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      toast.error("La cámara todavía no está lista.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("No pudimos tomar la foto.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );

    if (!blob) {
      toast.error("No pudimos tomar la foto.");
      return;
    }

    closeCamera();
    await uploadPhoto(
      new File([blob], "foto-webcam.jpg", { type: "image/jpeg" }),
    );
  }

  function clearPhoto() {
    setPreviewUrl(null);
    onClear();
  }

  function handleDroppedFile(file?: File) {
    setDragging(false);
    if (!file || disabled || uploading) return;
    void uploadPhoto(file);
  }

  return (
    <div
      className={`rounded-[18px] border-2 border-dashed p-4 transition-colors ${
        dragging
          ? "border-[var(--brand-primary)] bg-[var(--brand-highlight)]"
          : "border-[var(--brand-border)] bg-[var(--brand-page)]"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled && !uploading) setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled && !uploading) setDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleDroppedFile(event.dataTransfer.files?.[0]);
      }}
    >
      <div
        className={
          cameraOpen
            ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_280px] lg:items-start"
            : ""
        }
      >
        <ImageUploadColumns enabled={sidePreview}>
          <Avatar className={sidePreview ? "order-2 h-24 w-24 justify-self-center rounded-2xl border border-[var(--brand-border-soft)] bg-white shadow-sm" : "h-16 w-16 rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-page)]"}>
            <AvatarImage src={previewUrl ?? undefined} alt={title} />
            <AvatarFallback className="rounded-2xl bg-[var(--brand-highlight)] text-lg font-bold text-[var(--brand-heading)]">
              <Camera className="size-6" aria-hidden="true" />
            </AvatarFallback>
          </Avatar>

          <div className={sidePreview ? "order-1 min-w-0" : "min-w-0 flex-1"}>
            <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-primary)]">
              {title}
            </p>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              {description}
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                disabled={disabled || uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void uploadPhoto(file);
                  }

                  event.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-bold text-[var(--brand-ink)] hover:bg-[var(--brand-panel)]"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? (
                  <RefreshCw
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload className="size-4" aria-hidden="true" />
                )}
                Subir foto
              </Button>
              {allowCamera ? <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-bold text-[var(--brand-ink)] hover:bg-[var(--brand-panel)]"
                disabled={disabled || uploading || cameraOpen}
                onClick={openCamera}
              >
                <Camera className="size-4" aria-hidden="true" />
                Usar cámara
              </Button> : null}
              {previewUrl && allowClear ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-xl font-bold text-[var(--brand-muted)] hover:bg-red-50 hover:text-red-700"
                  disabled={disabled || uploading}
                  onClick={clearPhoto}
                >
                  <X className="size-4" aria-hidden="true" />
                  Quitar
                </Button>
              ) : null}
            </div>

            <p className="mt-3 text-xs font-medium text-[var(--brand-muted)]">
              JPG/PNG, máximo {MAX_KB}KB. Dimensiones entre {MIN_SIZE}x{MIN_SIZE}px y {MAX_SIDE}x{MAX_SIDE}px; las imágenes más grandes se ajustan automáticamente.
            </p>
            <p className="mt-1 text-xs font-bold text-[var(--brand-primary)]">
              {dragging
                ? "Soltá la imagen para cargarla"
                : "También podés arrastrar y soltar una imagen en esta tarjeta."}
            </p>
          </div>
        </ImageUploadColumns>

        {cameraOpen ? (
          <div className="flex flex-col justify-end gap-3 self-stretch lg:pb-1">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-[var(--brand-border)] font-bold text-[var(--brand-ink)]"
              onClick={closeCamera}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="h-10 rounded-xl bg-[var(--brand-heading)] font-bold text-white hover:bg-[var(--brand-primary)]"
              disabled={uploading || !cameraReady}
              onClick={capturePhoto}
            >
              <Camera className="size-4" aria-hidden="true" />
              Tomar foto
            </Button>
          </div>
        ) : null}

        {cameraOpen ? (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-square w-full object-cover"
            />
            {!cameraReady ? (
              <div className="absolute inset-0 grid place-items-center bg-black/80 px-4 text-center text-sm font-bold text-white">
                Iniciando cámara...
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
