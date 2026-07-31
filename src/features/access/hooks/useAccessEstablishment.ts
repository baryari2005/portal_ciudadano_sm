"use client";
import { useEffect, useState } from "react";
import { getAccessOptions, type EstablishmentOption } from "../services/access.service";
const KEY = "massm:access:establishment";
export function useAccessEstablishment() {
  const [options, setOptions] = useState<EstablishmentOption[]>([]);
  const [establishmentId, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { void getAccessOptions().then((items) => { setOptions(items); const saved = sessionStorage.getItem(KEY); setValue(items.some((item) => item.id === saved) ? saved! : ""); }).finally(() => setLoading(false)); }, []);
  function setEstablishmentId(id: string) { setValue(id); if (id) sessionStorage.setItem(KEY, id); else sessionStorage.removeItem(KEY); }
  return { options, establishmentId, setEstablishmentId, loading, selected: options.find((item) => item.id === establishmentId) };
}
