"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CheckCard } from "./CheckCard";

export type SearchableCheckListItem = { id: string; label: string; disabled?: boolean };

export function SearchableCheckList({
  items,
  selectedIds,
  onToggle,
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  columns = 2,
  maxHeight = 260,
  searchThreshold = 6,
}: {
  items: SearchableCheckListItem[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  columns?: 1 | 2;
  maxHeight?: number;
  searchThreshold?: number;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? items.filter((item) => item.label.toLowerCase().includes(value)) : items;
  }, [items, query]);

  return (
    <div className="space-y-2">
      {items.length > searchThreshold ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--brand-primary)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 text-sm"
          />
        </div>
      ) : null}
      {selectedIds.length ? (
        <p className="text-xs font-bold text-[var(--brand-primary)]">
          {selectedIds.length} seleccionado{selectedIds.length === 1 ? "" : "s"}
        </p>
      ) : null}
      <div
        className={`grid gap-2 overflow-y-auto pr-1 ${columns === 2 ? "sm:grid-cols-2" : ""}`}
        style={{ maxHeight: items.length > searchThreshold ? maxHeight : undefined }}
      >
        {filtered.map((item) => (
          <CheckCard
            key={item.id}
            checked={selectedIds.includes(item.id)}
            disabled={item.disabled}
            label={item.label}
            onChange={(checked) => onToggle(item.id, checked)}
          />
        ))}
        {!filtered.length ? <p className="col-span-full text-sm text-[var(--brand-muted)]">{emptyText}</p> : null}
      </div>
    </div>
  );
}
