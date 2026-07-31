"use client";

import { ChevronRight, Hash, UsersRound } from "lucide-react";

import { AdminListCard } from "@/components/shared/admin-patterns";
import { CatalogStatusBadge } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { formatSuggestedAgeRange } from "../helpers/age-range";
import type { PublicoObjetivo } from "../types/publico-objetivo.types";

export function PublicoObjetivoListItem({
  item,
  selected,
  onSelect,
}: {
  item: PublicoObjetivo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <AdminListCard
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      selected={selected}
      className={cn(!item.activo && "opacity-70")}
      leading={
        <span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm">
          <UsersRound className="size-6" aria-hidden="true" />
        </span>
      }
      title={item.nombre}
      badges={<CatalogStatusBadge active={item.activo} />}
      description={item.descripcion || "Sin descripción"}
      meta={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            {formatSuggestedAgeRange(
              item.edadMinimaSugerida,
              item.edadMaximaSugerida,
            )}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="size-3.5" aria-hidden="true" /> Orden {item.orden}
          </span>
        </span>
      }
      trailing={<ChevronRight />}
    />
  );
}
