"use client";

import { Building2, Loader2, Map, MapPinned } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGeorefTerritories } from "../hooks/useGeorefTerritories";

function normalizedTerritoryName(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}

type Props = {
  province: string;
  locality: string;
  onProvinceChange: (name: string) => void;
  onLocalityChange: (name: string) => void;
  onLocationInvalidated?: () => void;
  disabled?: boolean;
  lockedLocality?: string | null;
  className?: string;
  provinceError?: string;
  localityError?: string;
};

export function GeorefTerritoryFields({ province, locality, onProvinceChange, onLocalityChange, onLocationInvalidated, disabled, lockedLocality, className, provinceError, localityError }: Props) {
  const effectiveLocality = lockedLocality ?? locality;
  const georef = useGeorefTerritories(province, effectiveLocality);
  const controlClass = className ?? "h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)]";
  const changeProvince = (id: string) => { const selected = georef.provinces.find((item) => item.id === id); georef.setProvinceId(id); georef.setDepartmentId(""); onProvinceChange(selected?.name ?? ""); onLocalityChange(lockedLocality ?? ""); onLocationInvalidated?.(); };
  const changeDepartment = (id: string) => { georef.setDepartmentId(id); onLocalityChange(lockedLocality ?? ""); onLocationInvalidated?.(); };
  const changeLocality = (id: string) => { onLocalityChange(georef.localities.find((item) => item.id === id)?.name ?? ""); onLocationInvalidated?.(); };
  const localityId = georef.localities.find((item) => normalizedTerritoryName(item.name) === normalizedTerritoryName(effectiveLocality))?.id ?? "";

  return <>
    <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Provincia *</Label><div className="relative"><Map className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Select value={georef.provinceId} onValueChange={changeProvince} disabled={disabled || georef.loading}><SelectTrigger className={`${controlClass} pl-9`}><SelectValue placeholder="Seleccionar provincia"/></SelectTrigger><SelectContent>{georef.provinces.map((item)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>{provinceError?<p className="text-xs text-red-700">{provinceError}</p>:null}</div>
    <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Departamento / Partido *</Label><div className="relative"><Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Select value={georef.departmentId} onValueChange={changeDepartment} disabled={disabled || !georef.provinceId || georef.loading}><SelectTrigger className={`${controlClass} pl-9`}><SelectValue placeholder="Seleccionar departamento"/></SelectTrigger><SelectContent>{georef.departments.map((item)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></div>
    <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">Localidad *</Label><div className="relative"><MapPinned className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Select value={localityId} onValueChange={changeLocality} disabled={disabled || Boolean(lockedLocality) || !georef.departmentId || georef.loading}><SelectTrigger className={`${controlClass} pl-9`}><SelectValue placeholder="Seleccionar localidad"/></SelectTrigger><SelectContent>{georef.localities.map((item)=><SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div>{localityError?<p className="text-xs text-red-700">{localityError}</p>:georef.loading?<p className="flex items-center gap-1 text-xs text-[var(--brand-muted)]"><Loader2 className="size-3 animate-spin"/>Cargando datos oficiales…</p>:georef.error?<p className="text-xs text-red-700">{georef.error}</p>:null}</div>
  </>;
}
