"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, Hash, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AddressLocation, GeocodingResult } from "@/features/geocoding/types/location.types";
import { joinExactAddress, splitExactAddress } from "@/features/geocoding/helpers/exact-address";

type Props = { id: string; value: string; placeId?: string | null; lat?: number | null; lng?: number | null; locality?: string | null; province?: string | null; postalCode?: string | null; display?: "full" | "input" | "map"; onChange: (value: AddressLocation) => void; className?: string; disabled?: boolean; placeholder?: string };
const DEFAULT_CENTER: [number, number] = [-34.5431, -58.7119];

export function OpenStreetMapAddressPicker({ id, value, placeId, lat, lng, locality, province, postalCode, display = "full", onChange, className, disabled, placeholder }: Props) {
  const mapHost = useRef<HTMLDivElement>(null), mapRef = useRef<any>(null), markerRef = useRef<any>(null), callbackRef = useRef(onChange), exactAddressRef = useRef(value), coordinatesRef = useRef({ lat, lng });
  const [query, setQuery] = useState(value), [results, setResults] = useState<GeocodingResult[]>([]), [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  const initialExact = splitExactAddress(value);
  const [street, setStreet] = useState(initialExact.street), [streetNumber, setStreetNumber] = useState(initialExact.number), [complement, setComplement] = useState(initialExact.complement);
  callbackRef.current = onChange;
  exactAddressRef.current = value;
  coordinatesRef.current = { lat, lng };

  function normalizedAddress(result: AddressLocation, currentAddress: string) {
    const current = splitExactAddress(currentAddress);
    const canonicalStreet = result.street?.trim();
    const canonicalNumber = result.streetNumber?.trim();
    if (canonicalStreet) {
      return joinExactAddress(
        canonicalStreet,
        canonicalNumber || current.number,
        current.complement,
      );
    }
    return result.address;
  }

  useEffect(() => {
    setQuery(value);
    const parsed = splitExactAddress(value);
    setStreet(parsed.street); setStreetNumber(parsed.number); setComplement(parsed.complement);
  }, [value]);
  useEffect(() => {
    if (display === "input") return;
    if (!mapHost.current || mapRef.current) return;
    let active = true;
    void import("leaflet").then((module) => {
      if (!active || !mapHost.current) return;
      const L = module.default;
      const currentCoordinates = coordinatesRef.current;
      const hasCoordinates = currentCoordinates.lat != null && currentCoordinates.lng != null;
      const center: [number, number] = hasCoordinates ? [currentCoordinates.lat!, currentCoordinates.lng!] : DEFAULT_CENTER;
      const map = L.map(mapHost.current, { zoomControl: true }).setView(center, hasCoordinates ? 17 : 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
      const icon = L.divIcon({ className: "address-map-marker", html: '<span aria-hidden="true"></span>', iconSize: [30, 40], iconAnchor: [15, 40] });
      const selectPoint = async (point: { lat: number; lng: number }) => {
        markerRef.current?.setLatLng(point);
        setLoading(true); setMessage("");
        try { const response = await fetch(`/api/geocoding?lat=${point.lat}&lng=${point.lng}`); const body = await response.json(); if (!response.ok || !body.data) throw new Error(); callbackRef.current({ ...body.data, address: normalizedAddress(body.data, exactAddressRef.current) }); }
        catch { callbackRef.current({ address: exactAddressRef.current, placeId: null, lat: point.lat, lng: point.lng, provider: "openstreetmap" }); setMessage("Punto seleccionado; completá la dirección manualmente."); }
        finally { setLoading(false); }
      };
      const marker = L.marker(center, { draggable: true, icon, opacity: hasCoordinates ? 1 : 0 }).addTo(map);
      marker.on("dragend", () => void selectPoint(marker.getLatLng()));
      map.on("click", (event: any) => { marker.setOpacity(1); void selectPoint(event.latlng); });
      mapRef.current = map; markerRef.current = marker;
    });
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; };
  }, [display]);
  useEffect(() => { if (lat == null || lng == null || !mapRef.current || !markerRef.current) return; markerRef.current.setLatLng([lat, lng]).setOpacity(1); mapRef.current.setView([lat, lng], 17); }, [lat, lng]);

  async function search() {
    if (query.trim().length < 3) { setMessage("Ingresá al menos 3 caracteres."); return; }
    setLoading(true); setMessage(""); setResults([]);
    const exact = splitExactAddress(query);
    const searchableAddress = [exact.street, exact.number].filter(Boolean).join(" ");
    const contextualQuery = [searchableAddress, locality?.trim(), province?.trim(), postalCode?.trim(), "Argentina"].filter(Boolean).join(", ");
    try { const response = await fetch(`/api/geocoding?q=${encodeURIComponent(contextualQuery)}`); const body = await response.json(); if (!response.ok) throw new Error(body.message); setResults(body.data); if (!body.data.length) setMessage("No encontramos resultados. Podés marcar el punto en el mapa."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No pudimos buscar la dirección."); }
    finally { setLoading(false); }
  }
  function select(result: GeocodingResult) { const exactAddress = normalizedAddress(result, query); setResults([]); setQuery(exactAddress); callbackRef.current({ ...result, address: exactAddress }); mapRef.current?.setView([result.lat, result.lng], 17); markerRef.current?.setLatLng([result.lat, result.lng]).setOpacity(1); }

  function changeExact(nextStreet: string, nextNumber: string, nextComplement: string) {
    setStreet(nextStreet); setStreetNumber(nextNumber); setComplement(nextComplement);
    const address = joinExactAddress(nextStreet, nextNumber, nextComplement);
    setQuery(address); setResults([]); markerRef.current?.setOpacity(0);
    onChange({ address, placeId: null, lat: null, lng: null, provider: "manual" });
  }
  const addressInput = <div className="relative min-w-0 flex-1"><MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Input id={id} value={query} disabled={disabled} onChange={(event) => { setQuery(event.target.value); setResults([]); onChange({ address: event.target.value, placeId: null, lat: null, lng: null, provider: "manual" }); }} onKeyDown={(event) => { if (event.key === "Enter" && display !== "input") { event.preventDefault(); void search(); } }} className={className} placeholder={placeholder}/></div>;
  if (display === "input") return <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
    <div className="space-y-1"><label htmlFor={`${id}-street`} className="text-sm font-extrabold text-[var(--brand-ink)]">Calle *</label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Input id={`${id}-street`} value={street} disabled={disabled} onChange={(event) => changeExact(event.target.value, streetNumber, complement)} className={`${className ?? ""} pl-9`} placeholder="Ej: San Pablo" /></div></div>
    <div className="space-y-1"><label htmlFor={`${id}-number`} className="text-sm font-extrabold text-[var(--brand-ink)]">Altura *</label><div className="relative"><Hash className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Input id={`${id}-number`} value={streetNumber} disabled={disabled} inputMode="numeric" onChange={(event) => changeExact(street, event.target.value, complement)} className={`${className ?? ""} pl-9`} placeholder="Ej: 1660" /></div></div>
    <div className="space-y-1 sm:col-span-2"><label htmlFor={`${id}-complement`} className="text-sm font-extrabold text-[var(--brand-ink)]">Piso, departamento, casa o referencia</label><div className="relative"><Building2 className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[var(--brand-primary)]"/><Input id={`${id}-complement`} value={complement} disabled={disabled} onChange={(event) => changeExact(street, streetNumber, event.target.value)} className={`${className ?? ""} pl-9`} placeholder="Ej: Fondo, Casa A, Piso 2 Depto. B" /></div></div>
  </div>;
  return <div className="space-y-3">
    <p className="text-sm font-medium text-[var(--brand-muted)]">Completá dirección, localidad, provincia y código postal para encontrar una ubicación más precisa.</p>
    <div className="flex gap-2">{display === "full" ? addressInput : null}<Button type="button" className="w-full sm:w-auto" disabled={disabled || loading || query.trim().length < 3} onClick={() => void search()} aria-label="Buscar ubicación en el mapa">{loading ? <Loader2 className="animate-spin"/> : <Search/>}<span>Buscar ubicación en el mapa</span></Button></div>
    {results.length ? <div className="overflow-hidden rounded-xl border border-[var(--brand-border)] bg-white shadow-sm">{results.map((result) => <button key={result.placeId} type="button" className="block w-full border-b border-[var(--brand-border-soft)] px-4 py-3 text-left text-sm font-medium text-[var(--brand-ink)] last:border-0 hover:bg-[var(--brand-panel)]" onClick={() => select(result)}>{result.address}</button>)}</div> : null}
    <div ref={mapHost} className="h-80 min-h-80 w-full overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-panel)] lg:h-full lg:min-h-[390px]" aria-label="Mapa para seleccionar el domicilio"/>
    {placeId ? <p className="flex items-center gap-1 text-xs font-bold text-[var(--brand-primary)]"><CheckCircle2 className="size-3.5"/>Ubicación validada en el mapa</p> : <p className="text-xs font-medium text-[var(--brand-muted)]">Buscá la dirección o hacé clic en el mapa para ubicarla. El ingreso manual sigue disponible.</p>}{message ? <p className="text-xs font-bold text-amber-700">{message}</p> : null}
  </div>;
}
