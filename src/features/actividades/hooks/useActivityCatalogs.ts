"use client";

import { useCallback, useEffect, useState } from "react";

import { listCategoriasActividadesClient } from "@/features/categorias-actividades/services/categorias-actividades.service";
import type { CategoriaActividad } from "@/features/categorias-actividades/types/categoria-actividad.types";
import { listPublicosObjetivoClient } from "@/features/publicos-objetivo/services/publicos-objetivo.service";
import type { PublicoObjetivo } from "@/features/publicos-objetivo/types/publico-objetivo.types";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";

export function useActivityCatalogs() {
  const [categories, setCategories] = useState<CategoriaActividad[]>([]);
  const [publics, setPublics] = useState<PublicoObjetivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [categoryResponse, publicResponse] = await Promise.all([
        listCategoriasActividadesClient({
          activo: true,
          orderBy: "orden",
          orderDir: "asc",
          pageSize: 100,
        }),
        listPublicosObjetivoClient({
          activo: true,
          orderBy: "orden",
          orderDir: "asc",
          pageSize: 100,
        }),
      ]);
      setCategories(categoryResponse.data);
      setPublics(publicResponse.data);
    } catch (requestError) {
      setError(
        getAxiosMessage(
          requestError,
          "No pudimos cargar las categorías y públicos objetivo.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { categories, publics, loading, error, refresh };
}
