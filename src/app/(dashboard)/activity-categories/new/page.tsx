"use client";

import AccessDenied403Page from "../../403/page";
import { useCan } from "@/hooks/useCan";
import { CategoriaActividadFormPage } from "@/features/categorias-actividades/components/CategoriaActividadFormPage";

export default function NewActivityCategoryPage() {
  return useCan("categorias_actividades", "crear") ? (
    <CategoriaActividadFormPage />
  ) : (
    <AccessDenied403Page />
  );
}
