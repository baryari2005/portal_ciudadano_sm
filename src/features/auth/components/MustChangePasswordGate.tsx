"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/stores/auth";

type Props = {
  children: React.ReactNode;
};

export function MustChangePasswordGate({ children }: Props) {
  return (
    <Suspense fallback={null}>
      <MustChangePasswordGateContent>{children}</MustChangePasswordGateContent>
    </Suspense>
  );
}

function MustChangePasswordGateContent({ children }: Props) {
  const user = useAuth((state) => state.user);
  const loading = useAuth((state) => state.loading);
  const hasHydrated = useAuth((state) => state.hasHydrated);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const here =
    pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

  useEffect(() => {
    if (!hasHydrated || loading) {
      return;
    }

    if (!user) {
      return;
    }

    if (user.mustChangePassword && !pathname.startsWith("/change-password")) {
      router.replace(`/change-password?next=${encodeURIComponent(here)}`);
    }
  }, [hasHydrated, loading, user, pathname, here, router]);

  if (!hasHydrated || loading) {
    return null;
  }

  if (user?.mustChangePassword && !pathname.startsWith("/change-password")) {
    return null;
  }

  return <>{children}</>;
}
