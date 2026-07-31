"use client";

import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import { can, PermissionKey } from "@/lib/rbac";
import { toPermissionKeys } from "@/features/auth/libs/permissions";

export function HasPermission({
  need,
  children,
  fallback = null,
}: {
  need: PermissionKey | PermissionKey[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const permisos = useAuth((state) => state.user?.permisos ?? []);

  const permissionKeys = useMemo(() => {
    return toPermissionKeys(permisos);
  }, [permisos]);

  return can(permissionKeys, need) ? <>{children}</> : <>{fallback}</>;
}
