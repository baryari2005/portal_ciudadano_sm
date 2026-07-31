"use client";

import { useState } from "react";
import { toast } from "sonner";

import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";

import {
  createPublicoObjetivoClient,
  deletePublicoObjetivoClient,
  reactivatePublicoObjetivoClient,
  updatePublicoObjetivoClient,
} from "../services/publicos-objetivo.service";
import type {
  CreatePublicoObjetivoInput,
  UpdatePublicoObjetivoInput,
} from "../types/publico-objetivo.types";

export function usePublicoObjetivoMutations() {
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
    create: (payload: CreatePublicoObjetivoInput) =>
      run(
        () => createPublicoObjetivoClient(payload),
        "Público objetivo creado correctamente.",
      ),
    update: (id: string, payload: UpdatePublicoObjetivoInput) =>
      run(
        () => updatePublicoObjetivoClient(id, payload),
        "Público objetivo actualizado correctamente.",
      ),
    deactivate: (id: string) =>
      run(
        () => deletePublicoObjetivoClient(id),
        "Público objetivo desactivado correctamente.",
      ),
    reactivate: (id: string) =>
      run(
        () => reactivatePublicoObjetivoClient(id),
        "Público objetivo reactivado correctamente.",
      ),
  };
}
