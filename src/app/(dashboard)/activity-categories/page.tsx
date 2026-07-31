"use client";

import AccessDenied403Page from "../403/page";
import { CategoriasActividadesPage } from "@/features/categorias-actividades/components/CategoriasActividadesPage";
import { useCan } from "@/hooks/useCan";

export default function ActivityCategoriesRoutePage() {
  const canView = useCan("categorias_actividades", "ver");

  if (!canView) {
    return <AccessDenied403Page />;
  }

  return <CategoriasActividadesPage />;
}
