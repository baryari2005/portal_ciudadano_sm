"use client";

import type { ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DataTableProps<T> = {
  data: T[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSearchChange: (q: string) => void;
  columns: ColumnDef<T, unknown>[];
  sorting: SortingState;
  onSortingChange: (
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => void;
  searchPlaceholder?: string;
  toolbarActions?: ReactNode;
};

function getVisiblePages(page: number, totalPages: number) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  if (totalPages <= 5) {
    return pages;
  }

  return pages.filter(
    (pageNumber) =>
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - page) <= 1,
  );
}

export function GenericDataTable<T>({
  data,
  loading,
  page,
  pageSize,
  totalItems,
  totalPages,
  onPageChange,
  onSearchChange,
  columns,
  sorting,
  onSortingChange,
  searchPlaceholder = "Buscar...",
  toolbarActions,
}: DataTableProps<T>) {
  const table = useReactTable<T>({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const hasResults = data.length > 0;
  const firstItem = hasResults ? (safePage - 1) * pageSize + 1 : 0;
  const lastItem = hasResults
    ? Math.min(firstItem + data.length - 1, totalItems)
    : 0;
  const visiblePages = getVisiblePages(safePage, safeTotalPages);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xl">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />

          <Input
            placeholder={searchPlaceholder}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 rounded-md border-border bg-background pl-10 pr-10 text-base shadow-sm transition focus-visible:border-primary focus-visible:ring-primary/20 md:text-sm"
            aria-busy={loading}
          />

          {loading && (
            <Loader2
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-label="Buscando..."
            />
          )}
        </div>

        {toolbarActions && (
          <div className="flex shrink-0 items-center gap-2">
            {toolbarActions}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const direction = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className="select-none px-4 py-4 text-left font-semibold text-muted-foreground"
                    >
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-2 transition hover:text-primary disabled:cursor-default disabled:hover:text-muted-foreground"
                        disabled={!canSort}
                        aria-label="Ordenar"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}

                        {canSort && (
                          <span className="text-muted-foreground">
                            {direction === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : direction === "desc" ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-45" />
                            )}
                          </span>
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  className="p-6 text-muted-foreground"
                  colSpan={columns.length}
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </span>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  Sin resultados
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/40 transition-colors last:border-b-0 hover:bg-accent/25"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-4 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          {hasResults
            ? `Mostrando ${firstItem} a ${lastItem} de ${totalItems} registros`
            : "Sin resultados"}
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="h-10 w-10 rounded-md p-0"
            variant="outline"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1 || loading || !hasResults}
            aria-label="Pagina anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {visiblePages.map((pageNumber, index) => {
            const previousPage = visiblePages[index - 1];
            const needsEllipsis =
              previousPage !== undefined && pageNumber - previousPage > 1;

            return (
              <span key={pageNumber} className="flex items-center gap-2">
                {needsEllipsis && <span className="px-1">...</span>}
                <Button
                  className="h-10 min-w-10 rounded-md px-3"
                  variant={pageNumber === safePage ? "default" : "outline"}
                  onClick={() => onPageChange(pageNumber)}
                  disabled={loading || !hasResults}
                  aria-current={pageNumber === safePage ? "page" : undefined}
                >
                  {pageNumber}
                </Button>
              </span>
            );
          })}

          <Button
            className="h-10 w-10 rounded-md p-0"
            variant="outline"
            onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
            disabled={safePage >= safeTotalPages || loading || !hasResults}
            aria-label="Pagina siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
