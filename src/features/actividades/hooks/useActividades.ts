"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createActividadClient,
  deleteActividadClient,
  listActividadesClient,
  updateActividadClient,
} from "../services/actividades.service";
import type { Actividad, ActividadPayload } from "../types/actividad.types";

export function useActividades() {
  const [items, setItems] = useState<Actividad[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listActividadesClient();
      setItems(data);
      setSelectedId((current) =>
        current && data.some((item) => item.id === current) ? current : "",
      );
    } catch {
      setError("No pudimos cargar las actividades.");
      toast.error("No pudimos cargar actividades.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  async function save(payload: ActividadPayload, id?: string) {
    try {
      if (id) {
        await updateActividadClient(id, payload);
        toast.success("Actividad actualizada.");
      } else {
        await createActividadClient(payload);
        toast.success("Actividad creada.");
      }
      await refresh();
    } catch {
      toast.error("No pudimos guardar la actividad.");
      throw new Error("SAVE_ACTIVIDAD_FAILED");
    }
  }

  async function remove(id: string, reason: string) {
    try {
      await deleteActividadClient(id, reason);
      toast.success("Actividad cancelada.");
      setSelectedId("");
      await refresh();
    } catch {
      toast.error("No pudimos eliminar la actividad.");
    }
  }

  return {
    items,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    save,
    remove,
    refresh,
  };
}
