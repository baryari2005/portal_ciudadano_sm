"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  LibraryBig,
  Mail,
  MapPin,
  Phone,
  School,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel, AdminListCard } from "@/components/shared/admin-patterns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CatalogDetailField,
  CatalogEmptyState,
  CatalogLoadingState,
  CatalogPagination,
  CatalogPageHeader,
  CatalogSearchInput,
  CatalogStatusBadge,
  CatalogFilterPopover,
  CATALOG_PAGE_SIZE,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import { cn } from "@/lib/utils";

import { useEstablecimientos } from "../hooks/useEstablecimientos";
import type { Establecimiento } from "../types/establecimiento.types";

type StatusFilter = "all" | "activo" | "inactivo";

const weekDayOrder = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];

function orderedOpeningHours(horarios: Establecimiento["horarios"]) {
  return [...horarios].sort((left, right) => {
    const dayDifference = weekDayOrder.indexOf(left.diaSemana) - weekDayOrder.indexOf(right.diaSemana);
    return dayDifference || left.horaApertura.localeCompare(right.horaApertura);
  });
}

export function EstablecimientosPage() {
  const router = useRouter();
  const { items, selected, selectedId, setSelectedId, loading, remove } =
    useEstablecimientos();
  const canCreate = useCan("establecimientos", "crear");
  const canEdit = useCan("establecimientos", "editar");
  const canDelete = useCan("establecimientos", "eliminar");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus =
        status === "all" || item.estado.toLowerCase() === status;
      const searchable = [
        item.nombre,
        item.direccion,
        item.barrio,
        item.email,
        item.telefono,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [items, query, status]);
  const pageItems = filteredItems.slice(
    (page - 1) * CATALOG_PAGE_SIZE,
    page * CATALOG_PAGE_SIZE,
  );

  useEffect(() => setPage(1), [query, status]);

  if (loading) {
    return <CatalogLoadingState label="establecimientos" fullPage />;
  }

  async function confirmDelete() {
    if (!selected) return;
    await remove(selected.id);
    setPage(1);
    setDeleteOpen(false);
  }

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
      <CatalogPageHeader
        icon={School}
        title="Establecimientos"
        description="Administrá sedes, datos de contacto, horarios y actividades asociadas."
        total={items.length}
        createLabel="Nuevo establecimiento"
        canCreate={canCreate}
        onCreate={() => router.push("/facilities/new")}
      />

      <section className="grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
        <div
          className={cn(
            "min-h-0 flex-col gap-4",
            selectedId ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, dirección, barrio o contacto..." />
            <CatalogFilterPopover sections={[{ id: "facility-status", title: "Estado", value: status, options: [{ value: "all", label: "Todos" }, { value: "activo", label: "Activos" }, { value: "inactivo", label: "Inactivos" }], onChange: (value) => setStatus(value as StatusFilter) }]} />
          </div>

          {filteredItems.length === 0 ? (
            <CatalogEmptyState
              title="No se encontraron establecimientos."
              description="Creá una sede para administrar sus horarios y actividades."
              filtered={Boolean(query.trim()) || status !== "all"}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="brand-scrollbar grid min-h-0 flex-1 gap-3 overflow-y-auto pr-1">
              {pageItems.map((item) => (
                <AdminListCard
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  selected={selectedId === item.id}
                  className={item.estado.toLowerCase() !== "activo" ? "opacity-70" : undefined}
                  leading={item.imagenUrl ? <ActivityImagePreview source={item.imagenUrl} alt={`Imagen de ${item.nombre}`} className="size-12 rounded-xl" /> : <span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm"><School className="size-6" /></span>}
                  title={item.nombre}
                  badges={<CatalogStatusBadge active={item.estado.toLowerCase() === "activo"} />}
                  description={<span className="flex items-center gap-1 truncate"><MapPin className="size-3.5" />{item.direccion}</span>}
                  meta={`${item.actividades.length} actividades asociadas`}
                  trailing={<ChevronRight className="size-5" />}
                />
              ))}
              </div>
              <CatalogPagination
                page={page}
                total={filteredItems.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>

        <div className={cn("min-h-0", !selectedId && "hidden lg:block")}>
          <EstablecimientoDetail
            item={selected}
            canEdit={canEdit}
            canDelete={canDelete}
            onBack={() => setSelectedId("")}
            onEdit={(id) => router.push(`/facilities/${id}/edit`)}
            onDelete={() => setDeleteOpen(true)}
          />
        </div>
      </section>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar establecimiento"
        description="El establecimiento se eliminará si no posee relaciones que impidan la operación."
        confirmLabel="Eliminar"
        icon={<Trash2 />}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function EstablecimientoDetail({
  item,
  canEdit,
  canDelete,
  onBack,
  onEdit,
  onDelete,
}: {
  item: Establecimiento | null;
  canEdit: boolean;
  canDelete: boolean;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: () => void;
}) {
  if (!item) return <AdminDetailPanel empty="Seleccioná un establecimiento para consultar su detalle." />;

  return (
    <AdminDetailPanel onBack={onBack} className="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden">
      <AdminDetailHeader title={item.nombre} leading={item.imagenUrl ? <ActivityImagePreview source={item.imagenUrl} alt={`Imagen de ${item.nombre}`} className="size-16 rounded-2xl" /> : <div className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm"><School className="size-8" /></div>} badge={<CatalogStatusBadge active={item.estado.toLowerCase() === "activo"} />} action={<Button variant="outline" onClick={() => window.location.assign(`/facilities/${item.id}/record/overview`)} className="w-full border-[var(--brand-secondary)] bg-white font-bold text-[var(--brand-primary)]"><Eye />Ver ficha completa</Button>} />

      <div className="brand-scrollbar lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2"><dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={MapPin} label="Dirección">{item.direccion}</CatalogDetailField>
        <CatalogDetailField icon={MapPin} label="Localidad y provincia">{[item.localidad, item.provincia].filter(Boolean).join(", ") || "Sin registrar"}</CatalogDetailField>
        <CatalogDetailField icon={Mail} label="Email">{item.email || "Sin registrar"}</CatalogDetailField>
        <CatalogDetailField icon={Phone} label="Teléfono">{item.telefono || "Sin registrar"}</CatalogDetailField>
        <CatalogDetailField icon={Phone} label="Celular">{item.celular || "Sin registrar"}</CatalogDetailField>
        <CatalogDetailField icon={Clock} label="Horarios abiertos">
          <div className="grid gap-1">
            {item.horarios.length ? orderedOpeningHours(item.horarios).map((horario, index) => (
              <span key={horario.id ?? `${horario.diaSemana}-${horario.horaApertura}-${index}`}>
                {horario.diaSemana}: {horario.cerrado ? "Cerrado" : `${horario.horaApertura} a ${horario.horaCierre}`}
              </span>
            )) : "Sin horarios cargados."}
          </div>
        </CatalogDetailField>
        <CatalogDetailField icon={LibraryBig} label="Actividades asociadas">
          <div className="grid gap-1">
            {item.actividades.length ? item.actividades.map((actividad) => (
              <span key={actividad.id}>{actividad.nombre}</span>
            )) : "Sin actividades asociadas."}
          </div>
        </CatalogDetailField>
      </dl></div>
      {canEdit || canDelete ? <AdminDetailActions className="lg:shrink-0">
          {canEdit ? (
            <Button onClick={() => onEdit(item.id)} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]">
              <Edit3 /> Editar
            </Button>
          ) : null}
          {canDelete ? (
            <Button variant="outline" onClick={onDelete} className="text-red-700 hover:bg-red-50">
              <Trash2 /> Eliminar
            </Button>
          ) : null}
      </AdminDetailActions> : null}
    </AdminDetailPanel>
  );
}
