"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shapes } from "lucide-react";
import {
  AdminFormError,
  AdminFormLoading,
  AdminFormPage,
} from "@/components/layout/admin-form-page";
import { useCategoriaActividadMutations } from "../hooks/useCategoriaActividadMutations";
import { getCategoriaActividadClient } from "../services/categorias-actividades.service";
import type {
  CategoriaActividad,
  CreateCategoriaActividadInput,
} from "../types/categoria-actividad.types";
import { CategoriaActividadForm } from "./CategoriaActividadForm";
export function CategoriaActividadFormPage({ id }: { id?: string }) {
  const router = useRouter(),
    mutations = useCategoriaActividadMutations();
  const [item, setItem] = useState<CategoriaActividad | null>(null),
    [loading, setLoading] = useState(Boolean(id)),
    [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await getCategoriaActividadClient(id));
    } catch {
      setError("No se encontró la categoría solicitada.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(payload: CreateCategoriaActividadInput) {
    const saved = id
      ? await mutations.update(id, payload)
      : await mutations.create(payload);
    router.replace(`/activity-categories?selected=${saved.id}`);
  }
  return (
    <AdminFormPage
      title={id ? "Editar categoría" : "Nueva categoría"}
      description={
        id
          ? "Modificá la información de la categoría."
          : "Completá la información para clasificar actividades."
      }
      icon={Shapes}
      fullWidth
    >
      {loading ? (
        <AdminFormLoading />
      ) : error ? (
        <AdminFormError
          message={error}
          backHref="/activity-categories"
          onRetry={load}
        />
      ) : (
        <CategoriaActividadForm
          item={item}
          loading={mutations.loading}
          onCancel={() => router.push("/activity-categories")}
          onSubmit={save}
        />
      )}
    </AdminFormPage>
  );
}
