"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATALOG_PAGE_SIZE,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearchInput,
  CatalogFilterPopover,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { axiosInstance } from "@/lib/axios";

type PermissionRow = {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  modulo: string;
  accion: string;
};

export default function PermissionsPage() {
  const [data, setData] = useState<PermissionRow[]>([]);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const response = await axiosInstance.get("/permissions");
        setData(response.data.data ?? []);
      } catch {
        toast.error("No se pudo cargar permisos");
      } finally {
        setLoading(false);
      }
    }
    void fetchPermissions();
  }, []);

  const modules = useMemo(
    () => [...new Set(data.map((permission) => permission.modulo))].sort(),
    [data],
  );
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return data.filter((permission) => {
      const matchesModule =
        moduleFilter === "all" || permission.modulo === moduleFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          permission.nombre,
          permission.modulo,
          permission.accion,
          permission.descripcion,
        ].some((value) => value?.toLocaleLowerCase("es").includes(normalizedQuery));
      return matchesModule && matchesQuery;
    });
  }, [data, moduleFilter, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * CATALOG_PAGE_SIZE,
    currentPage * CATALOG_PAGE_SIZE,
  );

  useEffect(() => setPage(1), [query, moduleFilter]);

  if (loading) return <CatalogLoadingState label="permisos" fullPage />;

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
      <CatalogPageHeader
        title="Permisos"
        description="Consulta las acciones disponibles por modulo del sistema."
        total={filtered.length}
        createLabel=""
        canCreate={false}
        onCreate={() => undefined}
      />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <CatalogSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar permisos..."
        />
        <CatalogFilterPopover sections={[{ id: "permission-module", title: "Módulo", value: moduleFilter, options: [{ value: "all", label: "Todos los módulos" }, ...modules.map((module) => ({ value: module, label: module }))], onChange: setModuleFilter }]} />
      </div>

      <section className="min-h-0 overflow-hidden rounded-3xl border border-[var(--brand-secondary)]/20 bg-[var(--brand-panel)] p-4 shadow-sm sm:p-6">
        <div className="h-full overflow-auto rounded-[18px] border border-[var(--brand-border-soft)] bg-white/70">
          <Table>
            <TableHeader>
              <TableRow className="border-[var(--brand-border-soft)] hover:bg-transparent">
                {['Clave', 'Modulo', 'Accion', 'Descripcion'].map((label) => (
                  <TableHead key={label} className="font-extrabold text-[var(--brand-heading)]">{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length ? visible.map((permission) => (
                <TableRow key={permission.id} className="border-[var(--brand-border-soft)] hover:bg-[var(--brand-page)]">
                  <TableCell className="font-bold text-[var(--brand-ink)]">{permission.nombre ?? `${permission.modulo}:${permission.accion}`}</TableCell>
                  <TableCell className="font-medium text-[var(--brand-text)]">{permission.modulo}</TableCell>
                  <TableCell className="font-medium text-[var(--brand-text)]">{permission.accion}</TableCell>
                  <TableCell className="font-medium text-[var(--brand-text)]">{permission.descripcion || "Sin descripcion"}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="h-32 text-center font-medium text-[var(--brand-muted)]">No hay permisos para mostrar.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <CatalogPagination page={currentPage} total={filtered.length} onPageChange={setPage} />
    </div>
  );
}
