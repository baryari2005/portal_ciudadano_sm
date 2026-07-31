"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { listMedicalCoveragesClient, listPublicMedicalCoveragesClient, type MedicalCoverage } from "../services/medical-coverages.service";

export function MedicalCoverageSelect({ value, onChange, disabled, publicAccess = false, triggerClassName }: { value?: string | null; onChange: (value: string | null) => void; disabled?: boolean; publicAccess?: boolean; triggerClassName?: string }) {
  const [items, setItems] = useState<MedicalCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const selected = items.find((item) => item.id === value);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = publicAccess ? listPublicMedicalCoveragesClient() : listMedicalCoveragesClient();
    void request
      .then((data) => { if (active) setItems(data); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [publicAccess]);

  return (
    <Select value={value ?? "none"} onValueChange={(item) => onChange(item === "none" ? null : item)} disabled={disabled || loading}>
      <SelectTrigger className={cn("h-11 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5]", triggerClassName)}>
        {loading ? (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Cargando coberturas...
          </span>
        ) : selected ? (
          <span className="truncate">
            {selected.nombre} · {selected.tipo === "PREPAGA" ? "Prepaga" : "Obra social"}
          </span>
        ) : (
          <SelectValue placeholder="Seleccionar cobertura" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin cobertura</SelectItem>
        {items.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre} · {item.tipo === "PREPAGA" ? "Prepaga" : "Obra social"}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
