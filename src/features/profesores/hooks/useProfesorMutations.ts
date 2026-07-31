"use client";
import { useState } from "react";
import { toast } from "sonner";
import { getAxiosMessage } from "@/lib/errors/getAxiosErrorMessage";
import {
  cambiarEstadoProfesorClient,
  crearProfesorClient,
  desactivarProfesorClient,
  editarProfesorClient,
} from "../services/profesores.service";
import type {
  CreateProfesorInput,
  ProfesorEstado,
  UpdateProfesorInput,
} from "../types/profesor.types";

export function useProfesorMutations() {
  const [loading, setLoading] = useState(false);
  async function run<T>(action: () => Promise<T>, message: string) {
    setLoading(true);
    try {
      const result = await action();
      toast.success(message);
      return result;
    } catch (e) {
      const message = getAxiosMessage(e, "No pudimos completar la operación.");
      toast.error(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }
  return {
    loading,
    create: (data: CreateProfesorInput) =>
      run(() => crearProfesorClient(data), "Profesor creado correctamente."),
    update: (id: string, data: UpdateProfesorInput) =>
      run(
        () => editarProfesorClient(id, data),
        "Perfil actualizado correctamente.",
      ),
    deactivate: (id: string) =>
      run(
        () => desactivarProfesorClient(id),
        "Profesor desactivado correctamente.",
      ),
    changeStatus: (id: string, estado: ProfesorEstado) =>
      run(
        () => cambiarEstadoProfesorClient(id, estado),
        estado === "ACTIVO"
          ? "Profesor reactivado correctamente."
          : "Estado actualizado correctamente.",
      ),
  };
}
