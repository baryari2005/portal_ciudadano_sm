"use client";

import { useEffect, useState } from "react";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MobilePersonSearchResultCard } from "./MobilePersonSearchResultCard";
import type { PersonSearchOption } from "./PersonSearchSelector";

type Props<T extends PersonSearchOption> = {
  search: (query: string) => Promise<T[]>;
  onSelect: (person: T) => void;
  title: string;
  description: string;
  placeholder?: string;
  className?: string;
};

export function MobileCitizenSearch<T extends PersonSearchOption>({ search, onSelect, title, description, placeholder = "Buscar por DNI, nombre, apellido o email", className }: Props<T>) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const value = query.trim();
    setItems([]);
    setError(false);
    setLoading(value.length >= 2);
    if (value.length < 2) return;
    const timer = window.setTimeout(() => {
      void search(value).then((results) => { if (active) setItems(results); })
        .catch(() => { if (active) setError(true); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, search]);

  return <main className={className ?? "min-h-full min-w-0 bg-[var(--brand-page)] px-4 pb-6 pt-5"}>
    <header className="flex items-start gap-3">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--brand-panel)] text-[var(--brand-primary)]"><FileText className="size-6" /></span>
      <div className="min-w-0"><h1 className="text-xl font-extrabold text-[var(--brand-primary)]">{title}</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">{description}</p></div>
    </header>
    <div className="relative mt-5"><Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[var(--brand-primary)]" /><Input aria-label="Buscar persona" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} className="h-12 rounded-2xl border-[var(--brand-secondary)]/35 bg-white pl-12" /></div>
    <section className="mt-4 grid content-start gap-3" aria-live="polite" aria-busy={loading}>
      {loading ? <div role="status" aria-label="Buscando personas" className="h-32 animate-pulse rounded-2xl bg-[var(--brand-panel)]" /> : items.length ? items.map((person) => <MobilePersonSearchResultCard key={person.id} name={person.fullName} documentNumber={person.documentNumber} email={person.email} avatarUrl={person.avatarUrl || person.identityPhotoUrl} onClick={() => onSelect(person)} />) : <div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-white/70 p-5 text-center text-sm text-[var(--brand-muted)]">{error ? "No pudimos buscar personas. Intentá nuevamente modificando la búsqueda." : query.trim().length >= 2 ? "No se encontraron personas." : "Ingresá al menos dos caracteres para comenzar la búsqueda."}</div>}
    </section>
  </main>;
}
