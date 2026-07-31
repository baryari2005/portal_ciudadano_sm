"use client";

import { useParams } from "next/navigation";
import AccessDenied403Page from "../../../403/page";
import { useCan } from "@/hooks/useCan";
import { CategoriaActividadFormPage } from "@/features/categorias-actividades/components/CategoriaActividadFormPage";

export default function EditActivityCategoryPage() {
  const { id } = useParams<{ id: string }>();

  return useCan("categorias_actividades", "editar") ? (
    <CategoriaActividadFormPage id={id} />
  ) : (
    <AccessDenied403Page />
  );
}
