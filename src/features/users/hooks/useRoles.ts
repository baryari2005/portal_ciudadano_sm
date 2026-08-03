// src/features/users/hooks/useRoles.ts
"use client";
import { useEffect, useState } from "react";
import { listRoles } from "../services/api.service";
import { toast } from "sonner";
import { Role } from "../types/types";

export function useRoles(enabled = true) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) { setRoles([]); setLoading(false); return; }
    (async () => {
      try {
        setRoles(await listRoles());
      } catch {
        toast.error("No se pudieron cargar los roles");
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  return { roles, loading };
}
