"use client";

import { useState } from "react";
import { toast } from "sonner";

import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";

import {
  createCategoriaActividadClient,
  deleteCategoriaActividadClient,
  reactivateCategoriaActividadClient,
  updateCategoriaActividadClient,
} from "../services/categorias-actividades.service";
import type {
  CreateCategoriaActividadInput,
  UpdateCategoriaActividadInput,
} from "../types/categoria-actividad.types";

export function useCategoriaActividadMutations() {
  const [loading, setLoading] = useState(false);

  async function run<T>(action: () => Promise<T>, successMessage: string) {
    setLoading(true);
    try {
      const result = await action();
      toast.success(successMessage);
      return result;
    } catch (error) {
      const message = getAxiosMessage(
        error,
        "No pudimos completar la operación.",
      );
      toast.error(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    create: (payload: CreateCategoriaActividadInput) =>
      run(
        () => createCategoriaActividadClient(payload),
        "Categoría creada correctamente.",
      ),
    update: (id: string, payload: UpdateCategoriaActividadInput) =>
      run(
        () => updateCategoriaActividadClient(id, payload),
        "Categoría actualizada correctamente.",
      ),
    deactivate: (id: string) =>
      run(
        () => deleteCategoriaActividadClient(id),
        "Categoría desactivada correctamente.",
      ),
    reactivate: (id: string) =>
      run(
        () => reactivateCategoriaActividadClient(id),
        "Categoría reactivada correctamente.",
      ),
  };
}
