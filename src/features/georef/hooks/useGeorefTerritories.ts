"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeorefDepartment, GeorefLocality, GeorefLocalityResolution, GeorefProvince } from "../types/georef.types";

async function load<T>(params: URLSearchParams): Promise<T[]> {
  const response = await fetch(`/api/georef?${params}`);
  const body = await response.json() as { data?: T[]; message?: string };
  if (!response.ok) throw new Error(body.message ?? "No pudimos cargar las ubicaciones.");
  return body.data ?? [];
}

function normalizedTerritoryName(value?: string | null) {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")
    .replace(/^(provincia|ciudad autonoma)\s+(de|del)\s+/, "")
    .replace(/\s+/g, " ");
}

export function useGeorefTerritories(provinceName?: string | null, localityName?: string | null) {
  const [provinces, setProvinces] = useState<GeorefProvince[]>([]);
  const [departments, setDepartments] = useState<GeorefDepartment[]>([]);
  const [localities, setLocalities] = useState<GeorefLocality[]>([]);
  const [provinceId, setProvinceId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void load<GeorefProvince>(new URLSearchParams({ resource: "provinces" }))
      .then((items) => {
        if (!active) return;
        const expectedProvince = normalizedTerritoryName(provinceName);
        setProvinces(items);
        setProvinceId(items.find((item) => normalizedTerritoryName(item.name) === expectedProvince)?.id ?? "");
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "No pudimos cargar las provincias."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provinceName]);

  useEffect(() => {
    if (!provinceId) { setDepartments([]); setDepartmentId(""); return; }
    let active = true;
    setLoading(true);
    void load<GeorefDepartment>(new URLSearchParams({ resource: "departments", provinceId }))
      .then((items) => { if (active) setDepartments(items); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "No pudimos cargar los departamentos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provinceId]);

  useEffect(() => {
    if (!provinceId || !departmentId) { setLocalities([]); return; }
    let active = true;
    setLoading(true);
    void load<GeorefLocality>(new URLSearchParams({ resource: "localities", provinceId, departmentId }))
      .then((items) => { if (active) setLocalities(items); })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "No pudimos cargar las localidades."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [provinceId, departmentId]);

  useEffect(() => {
    if (!localityName || departmentId || !provinceId) return;
    let active = true;
    void load<GeorefLocalityResolution>(new URLSearchParams({ resource: "resolve-locality", provinceId, locality: localityName.trim() }))
      .then((matches) => { if (active && matches[0]) setDepartmentId(matches[0].departmentId); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [departmentId, localityName, provinceId]);

  return useMemo(() => ({ provinces, departments, localities, provinceId, departmentId, loading, error, setProvinceId, setDepartmentId }), [provinces, departments, localities, provinceId, departmentId, loading, error]);
}
