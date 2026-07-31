"use client";

import { useEffect, useRef, useState } from "react";

type ServerTimeResponse = {
  now: string;
  timeZone?: string;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cached = formatterCache.get(timeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone,
  });

  formatterCache.set(timeZone, formatter);
  return formatter;
}

export function useServerClock() {
  const [serverMs, setServerMs] = useState<number | null>(null);
  const [timeZone, setTimeZone] = useState("UTC");
  const [tick, setTick] = useState(0);
  const syncedAtRef = useRef(0);

  useEffect(() => {
    let active = true;

    async function syncServerTime() {
      const response = await fetch("/api/server-time", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("No se pudo obtener la hora del servidor");
      }

      const data = (await response.json()) as ServerTimeResponse;
      const nextServerMs = Date.parse(data.now);

      if (!active || Number.isNaN(nextServerMs)) {
        return;
      }

      syncedAtRef.current = performance.now();
      setServerMs(nextServerMs);
      setTimeZone(data.timeZone || "UTC");
    }

    syncServerTime().catch(() => {
      if (active) {
        setServerMs(null);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  // El estado tick fuerza el render cada segundo sin tomar la hora local como fuente.
  void tick;

  if (serverMs === null) {
    return {
      label: "Sincronizando hora...",
      loading: true,
    };
  }

  const elapsedMs = performance.now() - syncedAtRef.current;
  const currentServerDate = new Date(serverMs + elapsedMs);

  return {
    label: getFormatter(timeZone).format(currentServerDate),
    loading: false,
  };
}
