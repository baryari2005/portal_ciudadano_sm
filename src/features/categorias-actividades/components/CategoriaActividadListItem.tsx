"use client";

import { ChevronRight, Hash } from "lucide-react";

import { AdminListCard } from "@/components/shared/admin-patterns";
import { CatalogStatusBadge } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "../helpers/categoria-icons";
import type { CategoriaActividad } from "../types/categoria-actividad.types";

export function CategoriaActividadListItem({
  item,
  selected,
  onSelect,
}: {
  item: CategoriaActividad;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = getCategoryIcon(item.icono);
  const color = item.color || "#1D4F36";

  return (
    <AdminListCard
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      selected={selected}
      className={cn(!item.activo && "opacity-70")}
      leading={
        <span
          className="grid size-12 place-items-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
      }
      title={item.nombre}
      badges={<CatalogStatusBadge active={item.activo} />}
      description={item.descripcion || "Sin descripción"}
      meta={
        <span className="flex items-center gap-1">
          <Hash className="size-3.5" aria-hidden="true" />
          Orden {item.orden}
        </span>
      }
      trailing={<ChevronRight />}
    />
  );
}
