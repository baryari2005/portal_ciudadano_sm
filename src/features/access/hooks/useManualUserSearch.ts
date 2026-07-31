"use client";

import { useEffect, useState } from "react";

import { searchLegacyAccessPeople } from "../services/access.service";
import type { AccessPerson } from "../types/access.types";

export function useManualUserSearch(query: string) {
  const [results, setResults] = useState<AccessPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(false);

      try {
        const people = await searchLegacyAccessPeople(trimmedQuery);

        if (active) {
          setResults(people);
        }
      } catch {
        if (active) {
          setResults([]);
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query]);

  return { results, loading, error };
}
