"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  createEstablecimientoClient,
  deactivateEstablecimientoClient,
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
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await listEstablecimientosClient();
      setItems(data);
      setSelectedId((current) =>
        current && data.some((item) => item.id === current) ? current : "",
      );
    } catch {
      setError(
        "No pudimos consultar los establecimientos. Revisá tu sesión, tus permisos o la conexión y volvé a intentar.",
      );
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
      await deactivateEstablecimientoClient(id);
      toast.success("Establecimiento desactivado.");
      setSelectedId("");
      await refresh();
      return true;
    } catch {
      toast.error("No pudimos desactivar el establecimiento.");
      return false;
    }
  }

  return {
    items,
    selected,
    selectedId,
    setSelectedId,
    loading,
    error,
    refresh,
    save,
    remove,
  };
}
