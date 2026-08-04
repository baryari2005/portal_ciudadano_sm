"use client";

import { ChevronRight, CircleAlert, FilePenLine } from "lucide-react";

import { AdminListCard } from "@/components/shared/admin-patterns";
import { Badge } from "@/components/ui/badge";

import type { ActivityDraft } from "../types/activity-draft.types";

export function ActivityDraftsPanel({ items, selectedId, onSelect }: { items: ActivityDraft[]; selectedId?: string; onSelect?: (item: ActivityDraft) => void }) {
  if (!items.length) return null;
  return <>{items.map((item) => {
    const displayName = !item.name.trim() || item.name === "Actividad sin nombre" ? "Actividad en preparación" : item.name;
    return <AdminListCard key={item.id} onClick={() => onSelect?.(item)} selected={selectedId === item.id} leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><FilePenLine className="size-6" /></span>} title={displayName} badges={<Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900">{item.completion}%</Badge>} description={`Borrador pendiente de publicación · paso ${item.currentStep} de 10`} meta={item.pending[0] ? <span className="flex items-center gap-2 text-amber-900"><CircleAlert className="size-4" />{item.pending[0].label}</span> : "Sin datos pendientes"} trailing={<ChevronRight />} />;
  })}</>;
}
