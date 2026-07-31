"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Power, PowerOff, UsersRound } from "lucide-react";

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

import { usePublicoObjetivoMutations } from "../hooks/usePublicoObjetivoMutations";
import {
  usePublicoObjetivo,
  usePublicosObjetivo,
} from "../hooks/usePublicosObjetivo";
import { PublicoObjetivoDetail } from "./PublicoObjetivoDetail";
import { PublicoObjetivoListItem } from "./PublicoObjetivoListItem";

export function PublicosObjetivoPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CatalogStatusFilter>("all");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const params = useSearchParams();
  const initialSelectionApplied = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canCreate = useCan("publicos_objetivo", "crear");
  const canEdit = useCan("publicos_objetivo", "editar");
  const canChangeStatus = useCan("publicos_objetivo", "eliminar");
  const catalog = usePublicosObjetivo(query, status);
  const detail = usePublicoObjetivo(catalog.selectedId);
  const mutations = usePublicoObjetivoMutations();
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
    return <CatalogLoadingState label="públicos objetivo" fullPage />;
  }

  function openCreate() {
    router.push("/target-audiences/new");
  }

  function openEdit() {
    if (!selected) return;
    router.push(`/target-audiences/${selected.id}/edit`);
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
        icon={UsersRound}
        title="Dirigido a"
        description="Administrá las referencias que ayudan a identificar a quién está dirigida cada actividad."
        total={catalog.items.length}
        createLabel="Crear público"
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
            <CatalogLoadingState label="públicos objetivo" />
          ) : catalog.error ? (
            <CatalogErrorState
              message={catalog.error}
              onRetry={() => void catalog.refresh()}
            />
          ) : catalog.filteredItems.length === 0 ? (
            <CatalogEmptyState
              title="No se encontraron públicos objetivo."
              description="Creá públicos para clasificar a quién está dirigida cada actividad."
              filtered={filtersApplied}
            />
          ) : (
            <div className="flex min-h-0 flex-col gap-3">
              <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">
                {pageItems.map((item) => (
                  <PublicoObjetivoListItem
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
            <PublicoObjetivoDetail
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
          selected?.activo
            ? "Desactivar público objetivo"
            : "Reactivar público objetivo"
        }
        description={
          selected?.activo
            ? "El público dejará de aparecer en las selecciones activas. Podrás reactivarlo más adelante."
            : "El público volverá a estar disponible en las selecciones activas."
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
