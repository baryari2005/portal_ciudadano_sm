"use client";

import { TriangleAlertIcon, X } from "lucide-react";

export function ErrorBannerInput({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="rounded-md border border-red-500 bg-white">
      <div className="flex items-start gap-2 px-3 py-2.5 text-sm leading-5 text-red-700">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <TriangleAlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{message}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded p-1 hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
