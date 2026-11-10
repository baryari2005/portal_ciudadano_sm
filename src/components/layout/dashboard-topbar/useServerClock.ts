"use client";

import { ARGENTINA_TIME_ZONE } from "@/constants/time-zone";
import { useEffect, useState } from "react";

type ServerAnchor = { serverMs: number; receivedAt: number };
const formatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23", timeZone: ARGENTINA_TIME_ZONE,
});
const SYNC_INTERVAL_MS = 60_000;
const RETRY_INTERVAL_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;

export function useServerClock() {
  const [anchor, setAnchor] = useState<ServerAnchor | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let syncTimer: number | undefined;
    let controller: AbortController | undefined;

    async function syncServerTime() {
      if (!active || inFlight) return;
      window.clearTimeout(syncTimer);
      inFlight = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
      let synchronized = false;
      try {
        const response = await fetch("/api/server-time", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("No se pudo obtener la hora del servidor");
        const data = (await response.json()) as { now?: unknown };
        const serverMs = typeof data.now === "string" ? Date.parse(data.now) : NaN;
        if (!Number.isFinite(serverMs)) throw new Error("Hora del servidor inválida");
        if (active) {
          setAnchor({ serverMs, receivedAt: performance.now() });
          synchronized = true;
        }
      } catch {
        // Keep the last server reference; never fall back to the device clock.
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
        if (active) syncTimer = window.setTimeout(() => void syncServerTime(), synchronized ? SYNC_INTERVAL_MS : RETRY_INTERVAL_MS);
      }
    }

    const reconnect = () => void syncServerTime();
    const resume = () => { if (document.visibilityState === "visible") reconnect(); };
    void syncServerTime();
    const tickTimer = window.setInterval(() => setTick(value => value + 1), 1000);
    window.addEventListener("online", reconnect);
    window.addEventListener("focus", reconnect);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      controller?.abort();
      window.clearTimeout(syncTimer);
      window.clearInterval(tickTimer);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("focus", reconnect);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  if (!anchor) return { label: "Sincronizando hora...", loading: true, now: null };
  const currentServerDate = new Date(anchor.serverMs + performance.now() - anchor.receivedAt);
  return { label: formatter.format(currentServerDate), loading: false, now: currentServerDate };
}
