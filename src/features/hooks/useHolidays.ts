"use client";

import { useEffect, useState } from "react";

export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  type?: string;
};

export function useHolidays(year: number, country = "AR") {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(
          `/api/holidays?year=${year}&country=${country}`,
        );
        const data = await res.json();
        if (mounted) setHolidays(data);
      } catch (e) {
        console.error("Error cargando feriados", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [year, country]);

  return { holidays, loading };
}
