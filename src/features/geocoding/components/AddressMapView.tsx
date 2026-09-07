"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { MapPin } from "lucide-react";

type Props = {
  lat?: number | null;
  lng?: number | null;
  label?: string;
  className?: string;
};

export function AddressMapView({ lat, lng, label = "Ubicación del domicilio", className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const hasCoordinates = lat != null && lng != null;

  useEffect(() => {
    if (!hasCoordinates || !hostRef.current || mapRef.current) return;
    let active = true;
    void import("leaflet").then((module) => {
      if (!active || !hostRef.current) return;
      const L = module.default;
      const map = L.map(hostRef.current, { zoomControl: true, dragging: true, scrollWheelZoom: false }).setView([lat, lng], 17);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      const icon = L.divIcon({ className: "address-map-marker", html: '<span aria-hidden="true"></span>', iconSize: [30, 40], iconAnchor: [15, 40] });
      L.marker([lat, lng], { icon }).addTo(map).bindTooltip(label);
      mapRef.current = map;
    });
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; };
  }, [hasCoordinates, label, lat, lng]);

  if (!hasCoordinates) return <div className={`grid min-h-80 place-items-center rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-page)] p-6 text-center ${className ?? ""}`}><div><MapPin className="mx-auto size-9 text-[var(--brand-secondary)]"/><p className="mt-3 text-sm font-bold text-[var(--brand-primary)]">Ubicación no registrada</p><p className="mt-1 text-xs text-[var(--brand-muted)]">El domicilio todavía no tiene coordenadas para mostrar en el mapa.</p></div></div>;

  return <div ref={hostRef} className={`h-80 min-h-80 w-full overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-panel)] ${className ?? ""}`} aria-label={label}/>;
}
