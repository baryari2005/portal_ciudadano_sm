"use client";

import { ActividadesPage } from "@/features/actividades/components/ActividadesPage";
import { useCan } from "@/hooks/useCan";

import AccessDenied403Page from "../403/page";

export default function ActivitiesPage() {
  return useCan("actividades", "ver") ? <ActividadesPage /> : <AccessDenied403Page />;
}
