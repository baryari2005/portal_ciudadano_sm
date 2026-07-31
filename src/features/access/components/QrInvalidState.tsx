"use client";

import { AlertCircle } from "lucide-react";

export function QrInvalidState() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-[18px] border border-red-200/80 bg-red-50/80 px-5 py-4 text-red-700">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-semibold leading-5">
        El QR usado es invalido.
      </p>
    </div>
  );
}
