"use client";
import { Loader, Loader2 } from "lucide-react";

export function CenteredSpinner({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader className="h-6 w-6 animate-spin" />
        <span className="text-2xl animate-pulse">{label}</span>
      </div>
    </div>
  );
}

export function LoadingInTable({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex min-h-[10vh] items-center justify-center">
      <div className="text-xl text-muted-foreground flex items-center ">
        <Loader2 className="h-6 w-6 mr-4 animate-spin" />
        {label}
      </div>
    </div>
  );
}
