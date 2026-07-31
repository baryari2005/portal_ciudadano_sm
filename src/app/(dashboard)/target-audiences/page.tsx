"use client";

import AccessDenied403Page from "../403/page";
import { PublicosObjetivoPage } from "@/features/publicos-objetivo/components/PublicosObjetivoPage";
import { useCan } from "@/hooks/useCan";

export default function TargetAudiencesRoutePage() {
  const canView = useCan("publicos_objetivo", "ver");

  if (!canView) {
    return <AccessDenied403Page />;
  }

  return <PublicosObjetivoPage />;
}
