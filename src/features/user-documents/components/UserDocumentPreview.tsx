"use client";

import Image from "next/image";

export function UserDocumentPreview({ url, mimeType, originalName }: { url: string; mimeType: string; originalName: string }) {
  return mimeType.startsWith("image/") ? (
    <div className="grid h-full min-h-[65dvh] place-items-center overflow-auto rounded-2xl bg-white">
      <Image src={url} alt={`Vista previa de ${originalName}`} className="max-h-full max-w-full object-contain" fill />
    </div>
  ) : <iframe src={url} title={`Vista previa de ${originalName}`} className="h-[65dvh] w-full rounded-2xl border-0 bg-white" />;
}
