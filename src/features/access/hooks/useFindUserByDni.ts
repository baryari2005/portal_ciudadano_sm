"use client";

import { useCallback, useState } from "react";

import { findAccessPersonByDni } from "../services/access.service";

export function useFindUserByDni() {
  const [loading, setLoading] = useState(false);

  const findByDni = useCallback(async (dni: string) => {
    setLoading(true);

    try {
      return await findAccessPersonByDni(dni);
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { findByDni, loading };
}
