"use client";

import Image from "next/image";

export function UserDocumentPreview({ url, mimeType, originalName }: { url: string; mimeType: string; originalName: string }) {
  return mimeType.startsWith("image/") ? (
    <div className="flex min-h-[60dvh] items-center justify-center overflow-auto rounded-2xl bg-white p-4 sm:p-8">
      <div className="relative h-[min(62dvh,680px)] w-[min(100%,900px)]">
        <Image src={url} alt={`Vista previa de ${originalName}`} className="object-contain" fill sizes="(max-width: 768px) 90vw, 900px" />
      </div>
    </div>
  ) : <iframe src={url} title={`Vista previa de ${originalName}`} className="h-[65dvh] w-full rounded-2xl border-0 bg-white" />;
}
