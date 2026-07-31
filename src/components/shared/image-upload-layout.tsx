import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ImageUploadColumns({ children, enabled = true, className }: { children: ReactNode; enabled?: boolean; className?: string }) {
  return <div className={cn(enabled ? "grid gap-4 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-center" : "flex flex-col gap-4 sm:flex-row sm:items-center", className)}>{children}</div>;
}

export function ImageUploadPreviewPanel({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn("grid min-h-44 place-items-center rounded-2xl border border-[var(--brand-secondary)]/25 bg-[var(--brand-control)] p-3", !children && "border-dashed border-[var(--brand-secondary)]/45 text-center text-sm font-bold text-[var(--brand-muted)]", className)}>{children ?? "La imagen cargada se mostrará acá."}</div>;
}
