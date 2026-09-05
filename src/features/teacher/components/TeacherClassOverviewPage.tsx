"use client";

import { useEffect, useState } from "react";

import { CatalogEmptyState, CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import type { ActivitySession } from "@/features/activity-sessions/types/activity-session.types";

import { getTeacherClassClient } from "../services/teacher.service";
import { TeacherMobileClassOverview } from "./mobile/TeacherMobileClassOverview";

export function TeacherClassOverviewPage({ sessionId }: { sessionId: string }) {
  const [item, setItem] = useState<ActivitySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    void getTeacherClassClient(sessionId)
      .then(setItem)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, [sessionId]);

  if (loading) return <div className="md:hidden"><CatalogLoadingState label="detalle de clase" fullPage /></div>;
  if (error || !item) return <div className="p-4 md:hidden"><CatalogEmptyState title="No pudimos cargar la clase." description="Verificá el establecimiento seleccionado e intentá nuevamente." filtered={false} /></div>;

  return <div className="md:hidden"><TeacherMobileClassOverview item={item} /></div>;
}
