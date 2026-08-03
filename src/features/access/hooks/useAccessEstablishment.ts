"use client";
import { useEffect, useState } from "react";
import { getAccessOptions, type EstablishmentOption } from "../services/access.service";
import { RECEPTION_ESTABLISHMENT_STORAGE_KEY } from "@/features/auth/libs/workspaces";
export function useAccessEstablishment() {
  const [options, setOptions] = useState<EstablishmentOption[]>([]);
  const [establishmentId, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { void getAccessOptions().then((items) => { setOptions(items); const saved = sessionStorage.getItem(RECEPTION_ESTABLISHMENT_STORAGE_KEY); setValue(items.some((item) => item.id === saved) ? saved! : ""); }).finally(() => setLoading(false)); }, []);
  function setEstablishmentId(id: string) { setValue(id); if (id) sessionStorage.setItem(RECEPTION_ESTABLISHMENT_STORAGE_KEY, id); else sessionStorage.removeItem(RECEPTION_ESTABLISHMENT_STORAGE_KEY); }
  return { options, establishmentId, setEstablishmentId, loading, selected: options.find((item) => item.id === establishmentId) };
}
