"use client";

import { MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useWorkspaceEstablishment } from "./WorkspaceEstablishmentProvider";

export function WorkspaceEstablishmentSelector({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { options, establishmentId, setEstablishmentId, selected } = useWorkspaceEstablishment();
  return (
    <div className={cn(compact ? "flex min-w-0 items-center gap-2" : "hidden items-center gap-2 xl:flex", className)}>
      <MapPin className="size-4 shrink-0 text-[var(--brand-accent)]" />
      <Select value={establishmentId} onValueChange={setEstablishmentId}>
        <SelectTrigger
          size={compact ? "sm" : "default"}
          aria-label="Establecimiento"
          title={selected?.nombre}
          className={cn("min-w-0 border-white/25 bg-white/10 text-white [&_[data-slot=select-value]]:block [&_[data-slot=select-value]]:truncate", compact ? "w-full max-w-56 text-xs" : "h-10 w-56")}
        >
          <SelectValue placeholder="Establecimiento" />
        </SelectTrigger>
        <SelectContent>{options.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
