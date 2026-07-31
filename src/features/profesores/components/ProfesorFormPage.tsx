"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { AdminFormError, AdminFormLoading, AdminFormPage } from "@/components/layout/admin-form-page";

import { useProfesorMutations } from "../hooks/useProfesorMutations";
import { obtenerProfesorClient } from "../services/profesores.service";
import type { CreateProfesorInput, Profesor, UpdateProfesorInput } from "../types/profesor.types";
import { ProfesorForm } from "./ProfesorForm";

export function ProfesorFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const mutations = useProfesorMutations();
  const [item, setItem] = useState<Profesor | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItem(await obtenerProfesorClient(id));
    } catch {
      setError("No se encontró el profesor solicitado.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function create(data: CreateProfesorInput) {
    const saved = await mutations.create(data);
    router.replace(`/teachers?selected=${saved.id}`);
  }

  async function update(data: UpdateProfesorInput) {
    if (!id) return;
    const saved = await mutations.update(id, data);
    router.replace(`/teachers?selected=${saved.id}`);
  }

  return (
    <AdminFormPage
      title={id ? "Editar profesor" : "Nuevo profesor"}
      description={id ? "Modificá la información del perfil profesional." : "Asociá un usuario y completá su perfil profesional."}
      icon={GraduationCap}
      fullWidth
    >
      {loading ? <AdminFormLoading /> : error ? (
        <AdminFormError message={error} backHref="/teachers" onRetry={load} />
      ) : (
        <ProfesorForm item={item} loading={mutations.loading} onCancel={() => router.push("/teachers")} onCreate={create} onUpdate={update} />
      )}
    </AdminFormPage>
  );
}
