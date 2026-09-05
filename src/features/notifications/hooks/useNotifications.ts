"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listCitizenNotificationsClient,
  listNotificationsClient,
  listSentNotificationsClient,
} from "../services/notifications.service";
import type { Notification } from "../types/notification.types";

export function useCitizenNotifications(
  params?: Record<string, unknown>,
  scope: "citizen" | "admin" = "citizen",
  mailbox: "received" | "sent" = "received",
) {
  const [items, setItems] = useState<Notification[]>([]);
  const [meta, setMeta] = useState({ total: 0, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paramsKey = JSON.stringify(params ?? {});
  const stableParams = useMemo<Record<string, unknown>>(() => JSON.parse(paramsKey), [paramsKey]);

  const refresh = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        if (mailbox === "sent") {
          const result = await listSentNotificationsClient(stableParams);
          setItems(result.items);
          setMeta({ total: result.meta.total, unreadCount: 0 });
        } else if (scope === "admin") {
          const result = await listNotificationsClient(stableParams);
          setItems(result);
          setMeta({
            total: result.length,
            unreadCount: result.filter((item) => item.status === "NO_LEIDA").length,
          });
        } else {
          const result = await listCitizenNotificationsClient(stableParams);
          setItems(result.items);
          setMeta(result.meta);
        }
      } catch {
        setError("No pudimos cargar las notificaciones.");
      } finally {
        setHasLoaded(true);
        if (showLoading) setLoading(false);
      }
    },
    [stableParams, scope, mailbox],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, meta, loading, hasLoaded, error, refresh };
}

export function useNotifications(params?: Record<string, unknown>) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paramsKey = JSON.stringify(params ?? {});
  const stableParams = useMemo<Record<string, unknown>>(() => JSON.parse(paramsKey), [paramsKey]);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listNotificationsClient(stableParams));
    } catch {
      setError("No pudimos cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  }, [stableParams]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { items, loading, error, refresh };
}
