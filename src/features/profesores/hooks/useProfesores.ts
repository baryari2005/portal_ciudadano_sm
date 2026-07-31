"use client";

import { useCallback, useEffect, useState } from "react";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import {
  listarProfesoresClient,
  obtenerProfesorClient,
} from "../services/profesores.service";
import type { Profesor, ProfesorEstado } from "../types/profesor.types";

export function useProfesores(
  search: string,
  estado: ProfesorEstado | "TODOS",
) {
  const [items, setItems] = useState<Profesor[]>([]),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null);
  const refresh = useCallback(
    async (preferredId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await listarProfesoresClient({
          search: search || undefined,
          estado: estado === "TODOS" ? undefined : estado,
          pageSize: 100,
        });
        setItems(response.data);
        setSelectedId((current) => {
          const next = preferredId ?? current;
          return next && response.data.some((item) => item.id === next)
            ? next
            : null;
        });
      } catch (e) {
        setError(getAxiosMessage(e, "No pudimos cargar los profesores."));
      } finally {
        setLoading(false);
      }
    },
    [search, estado],
  );
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(timer);
  }, [refresh]);
  return { items, selectedId, setSelectedId, loading, error, refresh };
}

export function useProfesor(id: string | null) {
  const [item, setItem] = useState<Profesor | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!id) {
      setItem(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItem(await obtenerProfesorClient(id));
    } catch (e) {
      setError(getAxiosMessage(e, "No pudimos cargar el detalle."));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { item, loading, error, refresh };
}
