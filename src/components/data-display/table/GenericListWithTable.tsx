"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import axios from "axios";
import { axiosInstance } from "@/lib/axios";

type UnknownRecord = Record<string, unknown>;

export interface DataTableProps<T> {
  data: T[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSearchChange: (query: string) => void;
  columns: ColumnDef<T, unknown>[];
  sorting: SortingState;
  onSortingChange: (
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => void;
  searchPlaceholder?: string;
  toolbarActions?: React.ReactNode;
}

interface GenericListWithTableProps<T> {
  endpoint?: string;
  columns: ColumnDef<T, unknown>[];
  filters?: UnknownRecord;
  externalSearch?: string;
  DataTableComponent: React.ComponentType<DataTableProps<T>>;
  pageSize?: number;
  refreshToken?: unknown;
  clientData?: T[];
  paramNames?: {
    search?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    sortDir?: string;
  };
  responseAdapter?: (raw: unknown) => {
    items: T[];
    total: number;
    pageCount?: number;
  };
  toolbarActions?: React.ReactNode;
}

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

function useBusyDelay(busy: boolean, min = 200) {
  const [visible, setVisible] = useState<boolean>(busy);

  useEffect(() => {
    if (busy) {
      setVisible(true);
      return;
    }

    const timeout = setTimeout(() => setVisible(false), min);
    return () => clearTimeout(timeout);
  }, [busy, min]);

  return visible;
}

function stableStringify(obj: UnknownRecord) {
  const keys = Object.keys(obj).sort();
  return JSON.stringify(obj, keys);
}

export function GenericListWithTable<T>({
  endpoint,
  columns,
  filters,
  externalSearch = "",
  DataTableComponent,
  pageSize = 10,
  refreshToken,
  clientData,
  paramNames,
  responseAdapter,
  toolbarActions,
}: GenericListWithTableProps<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchDraft, setSearchDraft] = useState<string>(externalSearch);

  useEffect(() => {
    setSearchDraft(externalSearch);
  }, [externalSearch]);

  const debouncedSearch = useDebounce(searchDraft, 350);
  const isDebouncing = searchDraft !== debouncedSearch;
  const activeSort = sorting[0];

  const pn = useMemo(
    () => ({
      search: "search",
      page: "page",
      limit: "limit",
      sortBy: "sortBy",
      sortDir: "sortDir",
      ...(paramNames ?? {}),
    }),
    [paramNames],
  );

  const stableFilters = useMemo<UnknownRecord>(() => filters ?? {}, [filters]);

  const params = useMemo<UnknownRecord>(() => {
    const base: UnknownRecord = {
      [pn.page]: page,
      [pn.limit]: pageSize,
      ...stableFilters,
    };

    const trimmedSearch = debouncedSearch.trim();

    if (trimmedSearch) {
      base[pn.search] = trimmedSearch;
    }

    if (activeSort) {
      base[pn.sortBy] = activeSort.id;
      base[pn.sortDir] = activeSort.desc ? "desc" : "asc";
    }

    return base;
  }, [activeSort, debouncedSearch, page, pageSize, pn, stableFilters]);

  const requestKey = useMemo(() => stableStringify(params), [params]);

  const fetchData = useCallback(
    async (signal: AbortSignal) => {
      if (clientData) {
        setData(clientData);
        setTotalItems(clientData.length);
        setTotalPages(1);
        setLoading(false);
        return;
      }

      if (!endpoint) return;

      setLoading(true);

      try {
        const res = await axiosInstance.get(endpoint, { params, signal });
        const raw = res.data as unknown;

        let items: T[] = [];
        let total = 0;
        let pageCount: number | undefined;

        try {
          if (responseAdapter) {
            const adapted = responseAdapter(raw);
            items = Array.isArray(adapted?.items) ? adapted.items : [];
            total = Number(adapted?.total ?? 0);
            pageCount = adapted?.pageCount;
          } else if (
            typeof raw === "object" &&
            raw !== null &&
            "data" in raw &&
            "meta" in raw
          ) {
            const typedRaw = raw as {
              data?: unknown;
              meta?: {
                total?: unknown;
                pageCount?: unknown;
              };
            };

            items = Array.isArray(typedRaw.data) ? (typedRaw.data as T[]) : [];
            total = Number(typedRaw.meta?.total ?? items.length);
            pageCount =
              typeof typedRaw.meta?.pageCount === "number"
                ? typedRaw.meta.pageCount
                : undefined;
          } else if (
            typeof raw === "object" &&
            raw !== null &&
            "items" in raw
          ) {
            const typedRaw = raw as {
              items?: unknown;
              total?: unknown;
            };

            items = Array.isArray(typedRaw.items)
              ? (typedRaw.items as T[])
              : [];
            total = Number(typedRaw.total ?? items.length);
          } else if (Array.isArray(raw)) {
            items = raw as T[];
            total = raw.length;
          }
        } catch (error: unknown) {
          console.error("responseAdapter error:", error);
        }

        setData(items);
        setTotalItems(total || items.length);

        const pages = Math.max(
          1,
          pageCount ?? Math.ceil((total || 0) / pageSize),
        );

        setTotalPages(pages);
      } catch (error: unknown) {
        if (
          axios.isCancel(error) ||
          (error instanceof Error &&
            (error.name === "CanceledError" || error.message === "canceled"))
        ) {
          return;
        }

        console.error("Error en GenericListWithTable:", error);
      } finally {
        setLoading(false);
      }
    },
    [clientData, endpoint, pageSize, params, responseAdapter],
  );

  useEffect(() => {
    setPage(1);
    setLoading(true);
  }, [externalSearch]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);

    return () => controller.abort();
  }, [fetchData, refreshToken, requestKey]);

  const uiLoading = useBusyDelay(loading || isDebouncing, 200);

  return (
    <div className="mt-4 space-y-4">
      <DataTableComponent
        columns={columns}
        data={data}
        loading={uiLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        totalPages={totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onSearchChange={(value) => {
          setSearchDraft(value);
          setPage(1);
          setLoading(true);
        }}
        sorting={sorting}
        onSortingChange={(updater) =>
          setSorting((old) =>
            typeof updater === "function" ? updater(old) : updater,
          )
        }
        toolbarActions={toolbarActions}
      />
    </div>
  );
}
