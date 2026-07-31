"use client";
import { useCallback, useEffect, useState } from "react";
import {
  getDashboardClient,
  getReportClient,
} from "../services/dashboard.service";
import type {
  DashboardFilters,
  DashboardSummary,
} from "../types/dashboard-report.types";
export function useAdministrativeDashboard(
  filters: DashboardFilters,
  kind?: string,
) {
  const [data, setData] = useState<DashboardSummary | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const { from, to, activityId, establishmentId } = filters;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        kind
          ? await getReportClient(kind, {from,to,activityId,establishmentId})
          : await getDashboardClient({from,to,activityId,establishmentId}),
      );
    } catch {
      setError("No pudimos cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [from,to,activityId,establishmentId,kind]);
  useEffect(() => {
    void load();
  }, [load]);
  return { data, loading, error, retry: load };
}
