"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/errors/getErrorMessage";
import { getReceptionDashboard } from "../services/reception-dashboard.service";
import type { ReceptionDashboardData } from "../types/reception-dashboard.types";

export function useReceptionDashboard(establishmentId: string) {
  const [data, setData] = useState<ReceptionDashboardData | null>(null);
  const [loading, setLoading] = useState(Boolean(establishmentId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!establishmentId) { setData(null); setError(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try { setData(await getReceptionDashboard(establishmentId)); }
    catch (cause) { setData(null); setError(getErrorMessage(cause)); }
    finally { setLoading(false); }
  }, [establishmentId]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, retry: load };
}
