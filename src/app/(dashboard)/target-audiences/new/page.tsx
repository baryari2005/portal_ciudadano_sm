"use client";

import AccessDenied403Page from "../../403/page";
import { useCan } from "@/hooks/useCan";
import { PublicoObjetivoFormPage } from "@/features/publicos-objetivo/components/PublicoObjetivoFormPage";

export default function NewTargetAudiencePage() {
  return useCan("publicos_objetivo", "crear") ? (
    <PublicoObjetivoFormPage />
  ) : (
    <AccessDenied403Page />
  );
}
