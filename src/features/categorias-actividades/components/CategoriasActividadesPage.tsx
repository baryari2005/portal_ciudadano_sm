"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Power, PowerOff, Tags } from "lucide-react";

import {
  AdminDetailPanel,
  AdminListPane,
  AdminPageShell,
  AdminSplitLayout,
} from "@/components/shared/admin-patterns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CatalogEmptyState,
  CatalogErrorState,
  CatalogFilters,
  CatalogLoadingState,
  CatalogPagination,
  CatalogPageHeader,
  CATALOG_PAGE_SIZE,
  type CatalogStatusFilter,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

import { useCategoriaActividadMutations } from "../hooks/useCategoriaActividadMutations";
import {
  useCategoriaActividad,
  useCategoriasActividades,
} from "../hooks/useCategoriasActividades";
import { CategoriaActividadDetail } from "./CategoriaActividadDetail";
import { CategoriaActividadListItem } from "./CategoriaActividadListItem";

export function CategoriasActividadesPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CatalogStatusFilter>("all");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const params = useSearchParams();
  const initialSelectionApplied = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canCreate = useCan("categorias_actividades", "crear");
  const canEdit = useCan("categorias_actividades", "editar");
  const canChangeStatus = useCan("categorias_actividades", "eliminar");
  const catalog = useCategoriasActividades(query, status);
  const detail = useCategoriaActividad(catalog.selectedId);
  const mutations = useCategoriaActividadMutations();
  const selected = catalog.selectedId ? detail.item : null;
  const filtersApplied = Boolean(query.trim()) || status !== "all";
  const pageItems = catalog.filteredItems.slice(
    (page - 1) * CATALOG_PAGE_SIZE,
    page * CATALOG_PAGE_SIZE,
  );

  useEffect(() => setPage(1), [query, status]);
  useEffect(() => {
    if (initialSelectionApplied.current || catalog.loading) return;
    initialSelectionApplied.current = true;
    const preferredId = params.get("selected");
    if (preferredId && catalog.items.some((item) => item.id === preferredId)) {
      catalog.setSelectedId(preferredId);
    }
  }, [catalog, params]);

  if (catalog.loading) {
    return (
      <CatalogLoadingState label="categorías de actividades" fullPage />
    );
  }

  function openCreate() {
    router.push("/activity-categories/new");
  }

  function openEdit() {
    if (!selected) return;
    router.push(`/activity-categories/${selected.id}/edit`);
  }

  async function handleStatusChange() {
    if (!selected) return;
    try {
      const saved = selected.activo
        ? await mutations.deactivate(selected.id)
        : await mutations.reactivate(selected.id);

      setConfirmOpen(false);
      setPage(1);
      await catalog.refresh(saved.id);
      await detail.refresh();
    } catch {
      // El hook muestra el mensaje y el diálogo permanece abierto.
    }
  }

  return (
    <AdminPageShell>
      <CatalogPageHeader
        icon={Tags}
        title="Categorías de actividades"
        description="Organizá el catálogo utilizado para clasificar las propuestas municipales."
        total={catalog.items.length}
        createLabel="Crear categoría"
        canCreate={canCreate}
        onCreate={openCreate}
      />

      <AdminSplitLayout
        list={<AdminListPane detailOpen={Boolean(catalog.selectedId)}>
          <CatalogFilters
            query={query}
            status={status}
            searchPlaceholder="Buscar por nombre, slug o descripción..."
            onQueryChange={setQuery}
            onStatusChange={setStatus}
          />

          {catalog.loading ? (
            <CatalogLoadingState label="categorías" />
          ) : catalog.error ? (
            <CatalogErrorState
              message={catalog.error}
              onRetry={() => void catalog.refresh()}
            />
          ) : catalog.filteredItems.length === 0 ? (
            <CatalogEmptyState
              title="No se encontraron categorías."
              description="Creá una categoría para organizar las actividades municipales."
              filtered={filtersApplied}
            />
          ) : (
            <div className="flex min-h-0 flex-col gap-3">
              <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">
                {pageItems.map((item) => (
                  <CategoriaActividadListItem
                    key={item.id}
                    item={item}
                    selected={catalog.selectedId === item.id}
                    onSelect={() => catalog.setSelectedId(item.id)}
                  />
                ))}
              </div>
              <CatalogPagination
                page={page}
                total={catalog.filteredItems.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </AdminListPane>}
        detail={<div className={cn(!catalog.selectedId && "hidden lg:block")}>
          {detail.loading && catalog.selectedId ? (
            <AdminDetailPanel loading loadingLabel="el detalle" />
          ) : detail.error ? (
            <CatalogErrorState
              message={detail.error}
              onRetry={() => void detail.refresh()}
            />
          ) : (
            <CategoriaActividadDetail
              item={selected}
              canEdit={canEdit}
              canChangeStatus={canChangeStatus}
              onBack={() => catalog.setSelectedId(null)}
              onEdit={openEdit}
              onChangeStatus={() => setConfirmOpen(true)}
            />
          )}
        </div>}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={
          selected?.activo ? "Desactivar categoría" : "Reactivar categoría"
        }
        description={
          selected?.activo
            ? "La categoría dejará de aparecer en las selecciones activas. Podrás reactivarla más adelante."
            : "La categoría volverá a estar disponible en las selecciones activas."
        }
        confirmLabel={selected?.activo ? "Desactivar" : "Reactivar"}
        loading={mutations.loading}
        icon={selected?.activo ? <PowerOff /> : <Power />}
        onClose={() => !mutations.loading && setConfirmOpen(false)}
        onConfirm={handleStatusChange}
      />
    </AdminPageShell>
  );
}
