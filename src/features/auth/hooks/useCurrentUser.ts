"use client";

import { useAuth } from "@/stores/auth";

export function useCurrentUser() {
  const user = useAuth((state) => state.user);
  const loading = useAuth((state) => state.loading);
  const hasHydrated = useAuth((state) => state.hasHydrated);

  return { user, loading, hasHydrated };
}
