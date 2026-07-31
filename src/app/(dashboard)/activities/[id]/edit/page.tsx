"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { createDraftClient } from "@/features/activity-workflow/services/activity-drafts.service";
import { useCan } from "@/hooks/useCan";
import AccessDenied403Page from "../../../403/page";

export default function EditActivityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const started = useRef(false);
  const canEdit = useCan("actividades", "editar");

  useEffect(() => {
    if (!canEdit || started.current) return;
    started.current = true;
    void createDraftClient(id)
      .then((draft) => router.replace(`/activities/workflow/${draft.id}`))
      .catch(() => {
        toast.error("No pudimos preparar la edición de la actividad.");
        router.replace("/activities");
      });
  }, [canEdit, id, router]);

  if (!canEdit) return <AccessDenied403Page />;
  return <CatalogLoadingState label="edición de actividad" fullPage />;
}
