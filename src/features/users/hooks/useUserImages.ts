"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/lib/axios";
import { useAuth } from "@/stores/auth";

type Images = { avatarUrl: string | null; identityPhotoUrl: string | null };

export function useUserImages(userId?: string, avatarReference?: string | null, identityReference?: string | null) {
  const token = useAuth(state => state.token);
  const key = JSON.stringify([userId, avatarReference, identityReference, token]);
  const [resolved, setResolved] = useState<{ key: string; images: Images } | null>(null);
  useEffect(() => {
    if (!userId || !token || (!avatarReference && !identityReference)) return;
    const controller = new AbortController();
    async function refresh() {
      try {
        const { data } = await axiosInstance.get<{ data: Images }>(`/users/${encodeURIComponent(userId!)}/images`, { signal: controller.signal });
        if (!controller.signal.aborted) setResolved({ key, images: data.data });
      } catch {
        if (!controller.signal.aborted) setResolved({ key, images: { avatarUrl: null, identityPhotoUrl: null } });
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 240_000);
    const resume = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { controller.abort(); window.clearInterval(interval); window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); };
  }, [userId, token, avatarReference, identityReference, key]);
  return resolved?.key === key ? resolved.images : undefined;
}
