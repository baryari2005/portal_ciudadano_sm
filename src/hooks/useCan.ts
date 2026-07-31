"use client";

import { useMemo } from "react";
import { useAuth } from "@/stores/auth";
import {
  getPermissions,
  hasPermission,
} from "@/features/auth/libs/permissions";

export function useCan(modulo: string, accion: string): boolean {
  const rawPermissions = useAuth((state) => state.user?.permisos ?? []);

  const permissions = useMemo(() => {
    return getPermissions(rawPermissions);
  }, [rawPermissions]);

  return useMemo(() => {
    return hasPermission(permissions, modulo, accion);
  }, [permissions, modulo, accion]);
}
