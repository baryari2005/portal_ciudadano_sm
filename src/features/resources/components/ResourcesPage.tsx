"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Boxes, Building2, ChevronRight, Edit3, Hash, Layers3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel, AdminListCard } from "@/components/shared/admin-patterns";
import { CatalogDetailField, CatalogEmptyState, CatalogFilterPopover, CatalogLoadingState, CatalogPageHeader, CatalogPagination, CatalogSearchInput, CATALOG_PAGE_SIZE } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { deleteResourceClient, listResourcesClient } from "../services/resources.service";
import type { Resource } from "../types/resource.types";

type Status = "all" | Resource["estado"];
type Type = "all" | Resource["tipo"];
const typeLabels: Record<Resource["tipo"], string> = { ESPACIO: "Espacio", CANCHA: "Cancha", EQUIPAMIENTO: "Equipamiento", COMPUTADORA: "Computadora", ANDARIVEL: "Andarivel", OTRO: "Otro" };
const modeLabels: Record<Resource["modoReserva"], string> = { CAPACIDAD: "Capacidad compartida", ESPECIFICO: "Recurso específico", EXCLUSIVO: "Uso exclusivo" };
const statusLabels: Record<Resource["estado"], string> = { ACTIVO: "Activo", MANTENIMIENTO: "Mantenimiento", INACTIVO: "Inactivo" };

export function ResourcesPage() {
  const router = useRouter(), params = useSearchParams();
  const canCreate = useCan("resources", "crear"), canEdit = useCan("resources", "editar"), canDelete = useCan("resources", "eliminar");
  const [items, setItems] = useState<Resource[]>([]), [selectedId, setSelectedId] = useState(params.get("selected") ?? ""), [query, setQuery] = useState(""), [status, setStatus] = useState<Status>("all"), [type, setType] = useState<Type>("all"), [page, setPage] = useState(1), [loading, setLoading] = useState(true), [deleteOpen, setDeleteOpen] = useState(false);
  async function load() { setLoading(true); try { const data = await listResourcesClient(); setItems(data); if (!selectedId && data.length) setSelectedId(data[0].id); } catch (error) { toast.error(error instanceof Error ? error.message : "No pudimos cargar los recursos."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  useEffect(() => setPage(1), [query, status, type]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(() => items.filter((item) => { const text = `${item.nombre} ${item.codigo} ${item.descripcion ?? ""} ${item.establecimiento.nombre}`.toLowerCase(); return (!query.trim() || text.includes(query.trim().toLowerCase())) && (status === "all" || item.estado === status) && (type === "all" || item.tipo === type); }), [items, query, status, type]);
  const shown = filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  async function remove() { if (!selected) return; try { await deleteResourceClient(selected.id); toast.success("Recurso eliminado o inactivado correctamente."); setDeleteOpen(false); setSelectedId(""); await load(); } catch (error) { toast.error(error instanceof Error ? error.message : "No pudimos eliminar el recurso."); } }
  if (loading) return <CatalogLoadingState label="recursos físicos" fullPage />;
  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
    <CatalogPageHeader icon={Boxes} title="Recursos físicos" description="Administrá espacios, canchas y equipamiento utilizados por las actividades." total={items.length} createLabel="Nuevo recurso" canCreate={canCreate} onCreate={() => router.push("/resources/new")} />
    <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,.95fr)_minmax(420px,1.05fr)]">
      <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, código o establecimiento..." /><CatalogFilterPopover sections={[{ id: "resource-status", title: "Estado", value: status, options: [{ value: "all", label: "Todos" }, ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))], onChange: (value) => setStatus(value as Status) }, { id: "resource-type", title: "Tipo", value: type, options: [{ value: "all", label: "Todos" }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))], onChange: (value) => setType(value as Type) }]} /></div>
        {!filtered.length ? <CatalogEmptyState title="No se encontraron recursos." description="Creá un recurso para vincularlo con actividades y horarios." filtered={Boolean(query.trim()) || status !== "all" || type !== "all"} /> : <div className="flex min-h-0 flex-col gap-3"><div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">{shown.map((item) => <AdminListCard key={item.id} onClick={() => setSelectedId(item.id)} selected={selectedId === item.id} leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white"><Boxes /></span>} title={item.nombre} badges={<StatusBadge status={item.estado} />} description={`${item.codigo} · ${item.establecimiento.nombre}`} meta={`${typeLabels[item.tipo]} · ${item.capacidadUnidades} unidades`} trailing={<ChevronRight />} />)}</div><CatalogPagination page={page} total={filtered.length} onPageChange={setPage} /></div>}
      </div>
      <div className={cn(!selectedId && "hidden lg:block")}><ResourceDetail item={selected} canEdit={canEdit} canDelete={canDelete} onBack={() => setSelectedId("")} onEdit={(id) => router.push(`/resources/${id}/edit`)} onDelete={() => setDeleteOpen(true)} /></div>
    </section>
    <ConfirmDialog open={deleteOpen} title="Eliminar recurso" description="Si el recurso ya está relacionado con actividades o reservas, quedará inactivo para conservar su historial." confirmLabel="Eliminar" icon={<Trash2 />} onClose={() => setDeleteOpen(false)} onConfirm={remove} />
  </main>;
}

function ResourceDetail({ item, canEdit, canDelete, onBack, onEdit, onDelete }: { item: Resource | null; canEdit: boolean; canDelete: boolean; onBack: () => void; onEdit: (id: string) => void; onDelete: () => void }) {
  if (!item) return <AdminDetailPanel empty="Seleccioná un recurso para consultar su detalle." />;
  return <AdminDetailPanel onBack={onBack}><AdminDetailHeader title={item.nombre} leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white"><Boxes className="size-8" /></span>} badge={<StatusBadge status={item.estado} />} /><dl className="mt-6 grid gap-3"><CatalogDetailField icon={Hash} label="Código">{item.codigo}</CatalogDetailField><CatalogDetailField icon={Building2} label="Establecimiento">{item.establecimiento.nombre}</CatalogDetailField><CatalogDetailField icon={Boxes} label="Tipo">{typeLabels[item.tipo]}</CatalogDetailField><CatalogDetailField icon={Layers3} label="Forma de reserva">{modeLabels[item.modoReserva]}</CatalogDetailField><CatalogDetailField icon={Layers3} label="Capacidad">{item.capacidadUnidades} {item.capacidadUnidades === 1 ? "unidad" : "unidades"}</CatalogDetailField><CatalogDetailField icon={Boxes} label="Descripción">{item.descripcion || "Sin descripción."}</CatalogDetailField></dl>{canEdit || canDelete ? <AdminDetailActions>{canEdit ? <Button onClick={() => onEdit(item.id)} className="bg-[var(--brand-primary)]"><Edit3 />Editar</Button> : null}{canDelete ? <Button variant="outline" onClick={onDelete} className="text-red-700 hover:bg-red-50"><Trash2 />Eliminar</Button> : null}</AdminDetailActions> : null}</AdminDetailPanel>;
}
function StatusBadge({ status }: { status: Resource["estado"] }) { return <Badge variant="outline" className={status === "ACTIVO" ? "border-[var(--brand-secondary)]/40 bg-[#DDEBCF] text-[var(--brand-primary)]" : status === "MANTENIMIENTO" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-[var(--brand-neutral)] bg-[#E4E7E5] text-[var(--brand-muted)]"}>{statusLabels[status]}</Badge>; }
