"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, History, UserRound } from "lucide-react";
import {
  AdminDetailPanel,
  AdminListCard,
  AdminListPane,
  AdminPageShell,
  AdminSplitLayout,
} from "@/components/shared/admin-patterns";
import {
  CATALOG_PAGE_SIZE,
  CatalogEmptyState,
  CatalogFilterPopover,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearchInput,
  formatCatalogDate,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { useAuditLog } from "../hooks/useAuditLog";
import { AUDIT_ACTIONS, AUDIT_ENTITIES, AUDIT_ORIGINS, type AuditAction, type AuditEntity, type AuditOrigin } from "../types/audit-log.types";
import { AuditLogDetail } from "./AuditLogDetail";

const readable = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase("es-AR").replace(/^./, (letter) => letter.toUpperCase());

export function AuditLogPage() {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("all");
  const [entity, setEntity] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [initialized, setInitialized] = useState(false);
  const filters = useMemo(() => ({ search: query || undefined, action: action === "all" ? undefined : action as AuditAction, entityType: entity === "all" ? undefined : entity as AuditEntity, origin: origin === "all" ? undefined : origin as AuditOrigin, page, pageSize: CATALOG_PAGE_SIZE }), [query, action, entity, origin, page]);
  const { items, meta, loading } = useAuditLog(filters);
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const filtered = Boolean(query || action !== "all" || entity !== "all" || origin !== "all");

  useEffect(() => { if (!loading) setInitialized(true); }, [loading]);
  useEffect(() => setPage(1), [query, action, entity, origin]);

  if (!initialized && loading) return <CatalogLoadingState label="historial de modificaciones" fullPage />;

  return <AdminPageShell>
    <CatalogPageHeader icon={History} title="Historial de modificaciones" description="Consultá las acciones administrativas y los cambios registrados en el sistema." total={meta.total} />
    <AdminSplitLayout
      list={<AdminListPane detailOpen={Boolean(selectedId)}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar actor o entidad..." />
          <CatalogFilterPopover sections={[
            { id: "action", title: "Acción", value: action, options: [{ value: "all", label: "Todas" }, ...AUDIT_ACTIONS.map((value) => ({ value, label: readable(value) }))], onChange: setAction },
            { id: "entity", title: "Entidad", value: entity, options: [{ value: "all", label: "Todas" }, ...AUDIT_ENTITIES.map((value) => ({ value, label: readable(value) }))], onChange: setEntity },
            { id: "origin", title: "Origen", value: origin, options: [{ value: "all", label: "Todos" }, ...AUDIT_ORIGINS.map((value) => ({ value, label: readable(value) }))], onChange: setOrigin },
          ]} />
        </div>
        {loading ? <div className="grid min-h-64 place-items-center"><CatalogLoadingState label="registros de auditoría" /></div> : items.length ? <div className="flex min-h-0 flex-col gap-3">
          <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">
            {items.map((item) => <AdminListCard key={item.id} onClick={() => setSelectedId(item.id)} selected={item.id === selected?.id} leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white shadow-sm"><UserRound className="size-6" /></span>} title={item.actorName || "Sistema"} description={`${readable(item.action)} · ${readable(item.entityType)}`} meta={`${item.entityName || "Registro sin nombre"} · ${formatCatalogDate(item.createdAt)}`} trailing={<ChevronRight className="size-5" />} />)}
          </div>
          <CatalogPagination page={meta.page} total={meta.total} onPageChange={setPage} />
        </div> : <CatalogEmptyState title="No hay registros de auditoría." description="Las acciones auditadas aparecerán aquí." filtered={filtered} />}
      </AdminListPane>}
      detail={<div className={cn(!selectedId && "hidden lg:block")}><AdminDetailPanel onBack={() => setSelectedId("")} empty="Seleccioná un registro para consultar su detalle.">{selected ? <AuditLogDetail entry={selected} /> : undefined}</AdminDetailPanel></div>}
    />
  </AdminPageShell>;
}
