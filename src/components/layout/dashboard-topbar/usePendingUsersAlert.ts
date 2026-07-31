"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/stores/auth";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/features/notifications/services/notifications.service";

type PendingUsersResponse = {
  meta?: {
    total?: number;
  };
};

type OwnNotificationsResponse = {
  data?: {
    meta?: {
      unreadCount?: number;
    };
  };
};

const POLL_INTERVAL_MS = 60_000;

export function usePendingUsersAlert() {
  const token = useAuth((state) => state.token);
  const user = useAuth((state) => state.user);
  const hasHydrated = useAuth((state) => state.hasHydrated);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    if (!hasHydrated || !token || !user) {
      setPendingCount(0);
      return;
    }

    try {
      const [pendingResponse, notificationsResponse] = await Promise.all([
        fetch("/api/users?estado=PENDIENTE&page=1&pageSize=1", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/citizen/notifications?unreadOnly=true&page=1&pageSize=1", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const pendingData = pendingResponse.ok
        ? ((await pendingResponse.json()) as PendingUsersResponse)
        : null;
      const notificationsData = notificationsResponse.ok
        ? ((await notificationsResponse.json()) as OwnNotificationsResponse)
        : null;

      setPendingCount(pendingData?.meta?.total ?? 0);
      setUnreadNotificationCount(
        notificationsData?.data?.meta?.unreadCount ?? 0,
      );
    } catch {
      setPendingCount(0);
      setUnreadNotificationCount(0);
    }
  }, [hasHydrated, token, user]);

  useEffect(() => {
    void fetchPendingCount();

    const interval = window.setInterval(fetchPendingCount, POLL_INTERVAL_MS);
    const refresh = () => void fetchPendingCount();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    };
  }, [fetchPendingCount]);

  return {
    hasPendingUsers: pendingCount > 0,
    pendingCount,
    unreadNotificationCount,
    totalActions: unreadNotificationCount,
    notificationItems:
      [
        ...(unreadNotificationCount > 0
          ? [
              {
                key: "unread-notifications",
                label:
                  unreadNotificationCount === 1
                    ? "1 notificación sin leer"
                    : `${unreadNotificationCount} notificaciones sin leer`,
              },
            ]
          : []),
      ],
  };
}
