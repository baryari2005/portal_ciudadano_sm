import type { GeorefAddress, GeorefDepartment, GeorefLocality, GeorefLocalityResolution, GeorefProvince } from "../types/georef.types";
import { toAddressTitleCase } from "@/features/geocoding/helpers/exact-address";

const GEOREF_URL = "https://apis.datos.gob.ar/georef/api";

function normalizedName(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-AR");
}

function cleanStreetName(value: string) {
  return toAddressTitleCase(value.trim().replace(/^\d{4,}\s+/, ""));
}

type RawTerritory = { id: string; nombre: string; categoria?: string; departamento?: RawTerritory };
type RawAddress = {
  nomenclatura?: string;
  altura?: { valor?: number | string };
  calle?: { id?: string; nombre?: string };
  ubicacion?: { lat?: number; lon?: number };
  provincia?: RawTerritory;
  departamento?: RawTerritory;
  localidad_censal?: RawTerritory;
  localidad?: RawTerritory;
};

async function georefFetch<T>(path: string, params: URLSearchParams): Promise<T> {
  const response = await fetch(`${GEOREF_URL}/${path}?${params}`, { next: { revalidate: 86_400 } });
  if (!response.ok) throw new Error(`GEOREF_${response.status}`);
  return response.json() as Promise<T>;
}

export async function listGeorefProvinces(): Promise<GeorefProvince[]> {
  const body = await georefFetch<{ provincias?: RawTerritory[] }>("provincias", new URLSearchParams({ campos: "id,nombre", max: "100", orden: "nombre" }));
  return (body.provincias ?? []).map((item) => ({ id: item.id, name: item.nombre }));
}

export async function listGeorefDepartments(provinceId: string): Promise<GeorefDepartment[]> {
  const body = await georefFetch<{ departamentos?: RawTerritory[] }>("departamentos", new URLSearchParams({ provincia: provinceId, campos: "id,nombre,categoria", max: "1000", orden: "nombre" }));
  return (body.departamentos ?? []).map((item) => ({ id: item.id, name: item.nombre, category: item.categoria }));
}

export async function listGeorefLocalities(provinceId: string, departmentId: string): Promise<GeorefLocality[]> {
  const body = await georefFetch<{ localidades?: RawTerritory[] }>("localidades", new URLSearchParams({ provincia: provinceId, departamento: departmentId, campos: "id,nombre", max: "5000", orden: "nombre" }));
  const unique = new Map((body.localidades ?? []).map((item) => [normalizedName(item.nombre), { id: item.id, name: item.nombre }]));
  return [...unique.values()];
}

export async function resolveGeorefLocality(provinceId: string, localityName: string): Promise<GeorefLocalityResolution[]> {
  const body = await georefFetch<{ localidades?: RawTerritory[] }>("localidades", new URLSearchParams({ provincia: provinceId, nombre: localityName, campos: "id,nombre,departamento", max: "10" }));
  return (body.localidades ?? []).flatMap((item) => item.departamento ? [{ localityId: item.id, departmentId: item.departamento.id }] : []);
}

export async function searchGeorefAddresses(input: { address: string; province: string; department?: string; locality?: string }): Promise<GeorefAddress[]> {
  let department = input.department;
  if (!department && input.locality) {
    const territory = await georefFetch<{ localidades?: RawTerritory[] }>("localidades", new URLSearchParams({ provincia: input.province, nombre: input.locality, campos: "id,nombre,departamento", max: "10" }));
    department = territory.localidades?.find((item) => item.departamento)?.departamento?.nombre;
  }
  const params = new URLSearchParams({ direccion: cleanStreetName(input.address), provincia: input.province, max: "10" });
  if (department) params.set("departamento", department);
  if (input.locality) params.set("localidad", input.locality);
  const body = await georefFetch<{ direcciones?: RawAddress[] }>("direcciones", params);
  const addresses = (body.direcciones ?? []).flatMap((item, index) => {
    const lat = item.ubicacion?.lat;
    const lon = item.ubicacion?.lon;
    if (lat == null || lon == null || !item.provincia) return [];
    const locality = item.localidad_censal ?? item.localidad;
    const street = cleanStreetName(item.calle?.nombre ?? input.address);
    const formattedAddress = [street, item.altura?.valor, locality?.nombre, item.provincia.nombre].filter(Boolean).join(", ");
    return [{
      id: item.calle?.id ? `${item.calle.id}:${item.altura?.valor ?? index}:${locality?.id ?? ""}:${lat}:${lon}` : `georef:${lat}:${lon}`,
      formattedAddress,
      street,
      streetNumber: item.altura?.valor == null ? "" : String(item.altura.valor),
      province: { id: item.provincia.id, name: item.provincia.nombre },
      department: item.departamento ? { id: item.departamento.id, name: item.departamento.nombre, category: item.departamento.categoria } : null,
      locality: locality ? { id: locality.id, name: locality.nombre } : null,
      location: { lat, lon },
    }];
  });
  const unique = new Map<string, GeorefAddress>();
  for (const address of addresses) {
    const key = normalizedName(address.formattedAddress);
    if (!unique.has(key)) unique.set(key, address);
  }
  return [...unique.values()];
}
