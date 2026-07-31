"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { CatalogStatusFilter } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";

import {
  getPublicoObjetivoClient,
  listPublicosObjetivoClient,
} from "../services/publicos-objetivo.service";
import type { PublicoObjetivo } from "../types/publico-objetivo.types";

export function usePublicosObjetivo(
  query: string,
  status: CatalogStatusFilter,
) {
  const [items, setItems] = useState<PublicoObjetivo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listPublicosObjetivoClient({
        pageSize: 100,
        orderBy: "orden",
      });
      setItems(response.data);
      setSelectedId((current) => {
        const next = preferredId ?? current;
        return next && response.data.some((item) => item.id === next)
          ? next
          : null;
      });
    } catch (requestError) {
      setError(
        getAxiosMessage(
          requestError,
          "Ocurrió un error al consultar los públicos objetivo.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");

    return items.filter((item) => {
      const matchesStatus =
        status === "all" || (status === "active" ? item.activo : !item.activo);
      const searchable = [item.nombre, item.slug, item.descripcion]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");

      return (
        matchesStatus &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [items, query, status]);

  useEffect(() => {
    if (selectedId && !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredItems, selectedId]);

  return {
    items,
    filteredItems,
    selectedId,
    setSelectedId,
    loading,
    error,
    refresh,
  };
}

export function usePublicoObjetivo(id: string | null) {
  const [item, setItem] = useState<PublicoObjetivo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setItem(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setItem(await getPublicoObjetivoClient(id));
    } catch (requestError) {
      setItem(null);
      setError(
        getAxiosMessage(
          requestError,
          "No pudimos cargar el detalle del público objetivo.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { item, loading, error, refresh };
}
