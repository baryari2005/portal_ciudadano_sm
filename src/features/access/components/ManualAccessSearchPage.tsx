"use client";

import { useEffect, useState } from "react";

import { useManualUserSearch } from "../hooks/useManualUserSearch";
import type { AccessPerson } from "../types/access.types";
import { AccessPageHeader } from "./AccessPageHeader";
import { ManualUserDetailPanel } from "./ManualUserDetailPanel";
import { ManualUserResultCard } from "./ManualUserResultCard";
import { ManualUserSearchInput } from "./ManualUserSearchInput";

export function ManualAccessSearchPage() {
  const [query, setQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<AccessPerson | null>(
    null,
  );
  const { results, loading, error } = useManualUserSearch(query);
  const trimmedQuery = query.trim();

  useEffect(() => {
    setSelectedPerson((current) => {
      if (current && results.some((person) => person.id === current.id)) {
        return current;
      }

      return results[0] ?? null;
    });
  }, [results]);

  const showEmpty =
    trimmedQuery.length >= 2 && !loading && results.length === 0;

  return (
    <div className="grid h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_auto_minmax(0,1fr)] gap-6 overflow-hidden bg-[#F7FBF5] p-8">
      <AccessPageHeader
        title="Busqueda manual"
        description="Busca una persona por DNI, nombre o apellido para verificar su identidad."
      />

      <ManualUserSearchInput value={query} onChange={setQuery} />

      <section className="grid min-h-0 gap-8 overflow-hidden xl:grid-cols-[1.35fr_1fr]">
        <div className="min-h-0 overflow-y-auto rounded-[24px] border border-[#DDE8D7] bg-white p-5 shadow-sm">
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[104px] animate-pulse rounded-[20px] bg-[#EEF6E9]"
                />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              No pudimos cargar los resultados.
            </div>
          ) : null}

          {!loading && showEmpty ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[20px] bg-[#EEF6E9] p-8 text-center font-semibold text-[#5F6F68]">
              No se encontraron personas con ese criterio.
            </div>
          ) : null}

          {!loading && !error && results.length > 0 ? (
            <div className="grid gap-4">
              {results.map((person) => (
                <ManualUserResultCard
                  key={person.id}
                  person={person}
                  selected={selectedPerson?.id === person.id}
                  onSelect={setSelectedPerson}
                />
              ))}
            </div>
          ) : null}

          {!loading && !error && trimmedQuery.length < 2 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-[20px] bg-[#EEF6E9] p-8 text-center font-semibold text-[#5F6F68]">
              Ingresa al menos dos caracteres para iniciar la busqueda.
            </div>
          ) : null}
        </div>

        <ManualUserDetailPanel person={selectedPerson} />
      </section>
    </div>
  );
}
