"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/stores/auth";
import Loading from "@/app/(dashboard)/loading";
import { getUserAccessRedirect } from "@/features/auth/libs/access-state";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const token = useAuth((state) => state.token);
  const user = useAuth((state) => state.user);
  const loading = useAuth((state) => state.loading);
  const triedMe = useAuth((state) => state.triedMe);
  const hasHydrated = useAuth((state) => state.hasHydrated);
  const fetchMe = useAuth((state) => state.fetchMe);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!token) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!triedMe && !loading) {
      void fetchMe();
    }
  }, [hasHydrated, token, user, triedMe, loading, fetchMe, pathname, router]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (token && triedMe && !loading && user) {
      const redirectTo = getUserAccessRedirect(user);

      if (redirectTo && pathname !== redirectTo) {
        router.replace(redirectTo);
      }
    }
  }, [hasHydrated, token, triedMe, loading, user, pathname, router]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (token && triedMe && !loading && !user) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/login?next=${next}`);
    }
  }, [hasHydrated, token, triedMe, loading, user, pathname, router]);

  if (!hasHydrated) {
    return <Loading />;
  }

  if (!token) {
    return <Loading />;
  }

  if (!triedMe) {
    return <Loading />;
  }

  if (!user && (!triedMe || loading)) {
    return <Loading />;
  }

  if (!user) {
    return null;
  }

  if (getUserAccessRedirect(user)) {
    return <Loading />;
  }

  return <>{children}</>;
}
