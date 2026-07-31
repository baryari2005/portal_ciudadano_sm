"use client";

import { useParams } from "next/navigation";
import AccessDenied403Page from "../../../403/page";
import { useCan } from "@/hooks/useCan";
import { PublicoObjetivoFormPage } from "@/features/publicos-objetivo/components/PublicoObjetivoFormPage";

export default function EditTargetAudiencePage() {
  const { id } = useParams<{ id: string }>();

  return useCan("publicos_objetivo", "editar") ? (
    <PublicoObjetivoFormPage id={id} />
  ) : (
    <AccessDenied403Page />
  );
}
