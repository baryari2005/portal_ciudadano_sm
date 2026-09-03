"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createEstablecimientoClient,
  deleteEstablecimientoClient,
  listEstablecimientosClient,
  updateEstablecimientoClient,
} from "../services/establecimientos.service";
import type {
  Establecimiento,
  EstablecimientoPayload,
} from "../types/establecimiento.types";

export function useEstablecimientos() {
  const [items, setItems] = useState<Establecimiento[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listEstablecimientosClient();
      setItems(data);
      setSelectedId((current) =>
        current && data.some((item) => item.id === current) ? current : "",
      );
    } catch {
      toast.error("No pudimos cargar establecimientos.");
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

  async function save(payload: EstablecimientoPayload, id?: string) {
    try {
      if (id) {
        await updateEstablecimientoClient(id, payload);
        toast.success("Establecimiento actualizado.");
      } else {
        await createEstablecimientoClient(payload);
        toast.success("Establecimiento creado.");
      }
      await refresh();
    } catch {
      toast.error("No pudimos guardar el establecimiento.");
      throw new Error("SAVE_ESTABLECIMIENTO_FAILED");
    }
  }

  async function remove(id: string) {
    try {
      await deleteEstablecimientoClient(id);
      toast.success("Establecimiento eliminado.");
      setSelectedId("");
      await refresh();
    } catch {
      toast.error("No pudimos eliminar el establecimiento.");
    }
  }

  return { items, selected, selectedId, setSelectedId, loading, save, remove };
}
