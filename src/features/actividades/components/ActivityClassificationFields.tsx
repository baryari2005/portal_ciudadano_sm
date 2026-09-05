"use client";

import Link from "next/link";
import { Check, ChevronDown, Loader2, Tags, UsersRound, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryIcon } from "@/features/categorias-actividades/helpers/categoria-icons";
import type { CategoriaActividad } from "@/features/categorias-actividades/types/categoria-actividad.types";
import type { PublicoObjetivo } from "@/features/publicos-objetivo/types/publico-objetivo.types";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import type { ActividadNivel } from "../types/actividad.types";

type ActivityCategoryOption = Pick<
  CategoriaActividad,
  "id" | "nombre" | "color" | "icono" | "activo"
>;

type ActivityPublicOption = Pick<PublicoObjetivo, "id" | "nombre" | "activo">;

export function ActivityClassificationFields({
  categories,
  publics,
  selectedCategoryId,
  selectedPublicIds,
  selectedPublicsError,
  selectedLevel,
  loading,
  error,
  onRetry,
  onCategoryChange,
  onPublicsChange,
  onLevelChange,
}: {
  categories: ActivityCategoryOption[];
  publics: ActivityPublicOption[];
  selectedCategoryId: string | null;
  selectedPublicIds: string[];
  selectedPublicsError?: string;
  selectedLevel: ActividadNivel | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onCategoryChange: (id: string | null) => void;
  onPublicsChange: (ids: string[]) => void;
  onLevelChange: (level: ActividadNivel | null) => void;
}) {
  const canViewCategories = useCan("categorias_actividades", "ver");
  const canViewPublics = useCan("publicos_objetivo", "ver");
  const selectedPublics = selectedPublicIds
    .map((id) => publics.find((item) => item.id === id))
    .filter((item): item is ActivityPublicOption => Boolean(item));

  function togglePublic(id: string) {
    onPublicsChange(
      selectedPublicIds.includes(id)
        ? selectedPublicIds.filter((item) => item !== id)
        : [...selectedPublicIds, id],
    );
  }

  return (
    <section className="space-y-4 border-t border-[#D7E0D8] pt-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-primary)]">
          Clasificación
        </p>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Definí una categoría principal y los públicos a los que se dirige.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-page)] p-4 text-sm font-semibold text-[var(--brand-text)]">
          <Loader2 className="size-4 animate-spin" /> Cargando catálogos...
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="activity-category">Categoría principal</Label>
            <Select
              value={selectedCategoryId ?? "none"}
              onValueChange={(value) =>
                onCategoryChange(value === "none" ? null : value)
              }
            >
              <SelectTrigger
                id="activity-category"
                className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)]"
              >
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category.icono);
                  return (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      disabled={!category.activo}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="grid size-6 place-items-center rounded-md text-white"
                          style={{
                            backgroundColor: category.color || "var(--brand-primary)",
                          }}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        {category.nombre}
                        {!category.activo ? " (inactiva)" : ""}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {categories.length === 0 ? (
              <p className="text-xs text-[var(--brand-muted)]">
                No hay categorías activas disponibles.
              </p>
            ) : null}
            {canViewCategories ? (
              <Link
                href="/activity-categories"
                className="inline-flex text-xs font-bold text-[var(--brand-primary)] hover:underline"
              >
                Administrar categorías
              </Link>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Dirigido a *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full justify-between rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)]"
                >
                  <span className="flex items-center gap-2">
                    <UsersRound className="size-4" />
                    {selectedPublicIds.length
                      ? `${selectedPublicIds.length} seleccionados`
                      : "Seleccionar públicos"}
                  </span>
                  <ChevronDown className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[min(360px,calc(100vw-2rem))] p-2"
              >
                {publics.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No hay públicos objetivo activos disponibles.
                  </p>
                ) : (
                  <div className="max-h-64 space-y-1 overflow-y-auto">
                    {publics.map((item) => {
                      const checked = selectedPublicIds.includes(item.id);
                      const disabled = !item.activo && !checked;
                      return (
                        <label
                          key={item.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--brand-secondary)]/10",
                            disabled && "cursor-not-allowed opacity-55",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => togglePublic(item.id)}
                            className="size-4 accent-[var(--brand-primary)]"
                          />
                          <span className="flex-1">
                            {item.nombre}
                            {!item.activo ? " (inactivo)" : ""}
                          </span>
                          {checked ? (
                            <Check className="size-4 text-[var(--brand-primary)]" />
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            {selectedPublicsError ? (
              <p className="text-xs text-red-700">{selectedPublicsError}</p>
            ) : null}
            {canViewPublics ? (
              <Link
                href="/target-audiences"
                className="inline-flex text-xs font-bold text-[var(--brand-primary)] hover:underline"
              >
                Administrar públicos objetivo
              </Link>
            ) : null}
          </div>
        </div>
      )}

      <div className="max-w-md space-y-2">
        <Label htmlFor="activity-level">Nivel</Label>
        <Select
          value={selectedLevel ?? "none"}
          onValueChange={(value) =>
            onLevelChange(value === "none" ? null : (value as ActividadNivel))
          }
        >
          <SelectTrigger
            id="activity-level"
            className="h-11 w-full rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)]"
          >
            <SelectValue placeholder="Sin nivel definido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin nivel definido</SelectItem>
            <SelectItem value="INICIAL">Inicial</SelectItem>
            <SelectItem value="INTERMEDIO">Intermedio</SelectItem>
            <SelectItem value="AVANZADO">Avanzado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedPublics.length ? (
        <div
          className="flex flex-wrap gap-2"
          aria-label="Públicos seleccionados"
        >
          {selectedPublics.map((item) => (
            <Badge
              key={item.id}
              variant="outline"
              className={cn(
                "gap-1 rounded-full border-[var(--brand-secondary)]/40 bg-white px-3 py-1 text-[var(--brand-primary)]",
                !item.activo && "border-[var(--brand-neutral)] text-[#666]",
              )}
            >
              <Tags className="size-3" />
              {item.nombre}
              {!item.activo ? " · Inactivo" : ""}
              <button
                type="button"
                onClick={() => togglePublic(item.id)}
                aria-label={`Quitar ${item.nombre}`}
                className="ml-1 rounded-full hover:bg-black/5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function mergeActivityCategoryOptions(
  active: ActivityCategoryOption[],
  selected?: ActivityCategoryOption | null,
) {
  return selected && !active.some((item) => item.id === selected.id)
    ? [...active, selected]
    : active;
}

export function mergeActivityPublicOptions(
  active: ActivityPublicOption[],
  selected: ActivityPublicOption[],
) {
  const activeIds = new Set(active.map((item) => item.id));
  return [...active, ...selected.filter((item) => !activeIds.has(item.id))];
}
