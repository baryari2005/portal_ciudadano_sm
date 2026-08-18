import type { GeocodingResult } from "../types/location.types";

type NominatimAddress = Record<string, string | undefined>;
type NominatimPlace = { place_id: number; display_name: string; lat: string; lon: string; address?: NominatimAddress };

const cache = new Map<string, { expires: number; value: GeocodingResult[] }>();
const CACHE_MS = 60 * 60 * 1000;
let nextRequestAt = 0;

function mapPlace(place: NominatimPlace): GeocodingResult {
  const address = place.address ?? {};
  return {
    address: place.display_name,
    placeId: String(place.place_id),
    lat: Number(place.lat),
    lng: Number(place.lon),
    locality: address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb,
    province: address.state,
    postalCode: address.postcode,
    street: address.road ?? address.pedestrian ?? address.residential,
    streetNumber: address.house_number,
    provider: "openstreetmap",
  };
}

async function request(url: URL): Promise<GeocodingResult[]> {
  const key = url.toString();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  nextRequestAt = Date.now() + 1100;
  const response = await fetch(url, {
    headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "massm-actividades/1.0 (municipal address picker)", "Accept-Language": "es-AR,es" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("El servicio de ubicaciones no está disponible.");
  const payload = (await response.json()) as NominatimPlace | NominatimPlace[];
  const value = (Array.isArray(payload) ? payload : [payload]).map(mapPlace);
  cache.set(key, { expires: Date.now() + CACHE_MS, value });
  return value;
}

export function searchAddresses(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ar");
  url.searchParams.set("limit", "5");
  return request(url);
}

export async function reverseAddress(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  const items = await request(url);
  return items[0] ?? null;
}
