"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UsersRound } from "lucide-react";
import {
  AdminFormError,
  AdminFormLoading,
  AdminFormPage,
} from "@/components/layout/admin-form-page";
import { usePublicoObjetivoMutations } from "../hooks/usePublicoObjetivoMutations";
import { getPublicoObjetivoClient } from "../services/publicos-objetivo.service";
import type {
  CreatePublicoObjetivoInput,
  PublicoObjetivo,
} from "../types/publico-objetivo.types";
import { PublicoObjetivoForm } from "./PublicoObjetivoForm";
export function PublicoObjetivoFormPage({ id }: { id?: string }) {
  const router = useRouter(),
    mutations = usePublicoObjetivoMutations();
  const [item, setItem] = useState<PublicoObjetivo | null>(null),
    [loading, setLoading] = useState(Boolean(id)),
    [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await getPublicoObjetivoClient(id));
    } catch {
      setError("No se encontró el público objetivo solicitado.");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(payload: CreatePublicoObjetivoInput) {
    const saved = id
      ? await mutations.update(id, payload)
      : await mutations.create(payload);
    router.replace(`/target-audiences?selected=${saved.id}`);
  }
  return (
    <AdminFormPage
      title={id ? "Editar Dirigido a..." : "Nuevo Público Dirigido"}
      description={
        id
          ? "Modificá la información del público objetivo."
          : "Completá la referencia para clasificar actividades."
      }
      icon={UsersRound}
      fullWidth
    >
      {loading ? (
        <AdminFormLoading />
      ) : error ? (
        <AdminFormError
          message={error}
          backHref="/target-audiences"
          onRetry={load}
        />
      ) : (
        <PublicoObjetivoForm
          item={item}
          loading={mutations.loading}
          onCancel={() => router.push("/target-audiences")}
          onSubmit={save}
        />
      )}
    </AdminFormPage>
  );
}
