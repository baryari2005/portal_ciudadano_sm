"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Edit3,
  Eye,
  FileText,
  KeyRound,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  AdminDetailActions,
  AdminDetailHeader,
  AdminDetailPanel,
  AdminListCard,
} from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { axiosInstance } from "@/lib/axios";
import { useCan } from "@/hooks/useCan";
import {
  CATALOG_PAGE_SIZE,
  CatalogFilters,
  CatalogDetailField,
  CatalogEmptyState,
  CatalogErrorState,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  type CatalogStatusFilter,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import type { Permiso, Role } from "../../types/types";
import { RoleStatusBadge } from "../RoleStatusBadge";
import { RolesManagementLoadingState } from "./RolesManagementLoadingState";
import { resolveRoleCode } from "../../lib/role-code";

type RoleListMeta = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

type RoleListResponse = {
  data?: Role[];
  meta?: Partial<RoleListMeta>;
};

type RoleDetail = Role & {
  permisos?: Array<{
    permiso: Permiso;
  }>;
};

type RoleDetailResponse = {
  data?: RoleDetail;
};

const PAGE_SIZE = CATALOG_PAGE_SIZE;

const emptyMeta: RoleListMeta = {
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  pageCount: 1,
};

export function RolesManagementPage() {
  const router = useRouter();
  const canCreate = useCan("roles", "crear");
  const canEdit = useCan("roles", "editar");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<CatalogStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState<Role[]>([]);
  const [meta, setMeta] = useState<RoleListMeta>(emptyMeta);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const detailRequestIdRef = useRef(0);

  useEffect(() => {
    setPage(1);
  }, [query, status]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setRolesLoaded(false);
      setError(null);
      setInitialLoadComplete(false);
      setSelectedRole(null);
      setDetailLoading(false);
      detailRequestIdRef.current += 1;

      try {
        const { data } = await axiosInstance.get<RoleListResponse>("/roles", {
          params: {
            q: query,
            activo: status === "all" ? undefined : status === "active",
            page,
            pageSize: PAGE_SIZE,
            sortBy: "nombre",
            sortDir: "asc",
          },
        });

        if (!active) {
          return;
        }

        const nextRoles = data.data ?? [];
        setRoles(nextRoles);
        setMeta({
          total: data.meta?.total ?? 0,
          page: data.meta?.page ?? page,
          pageSize: data.meta?.pageSize ?? PAGE_SIZE,
          pageCount: data.meta?.pageCount ?? 1,
        });
        setSelectedRoleId((current) =>
          nextRoles.some((role) => role.id === current) ? current : null,
        );

        if (nextRoles.length === 0) {
          setInitialLoadComplete(true);
        }
      } catch {
        if (active) {
          setRoles([]);
          setMeta(emptyMeta);
          setSelectedRoleId(null);
          setError("No pudimos cargar los roles.");
          setInitialLoadComplete(true);
        }
      } finally {
        if (active) {
          setLoading(false);
          setRolesLoaded(true);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [page, query, reloadToken, status]);

  const loadRoleDetail = useCallback(async (roleId: number) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setDetailLoading(true);

    try {
      const { data } = await axiosInstance.get<RoleDetailResponse>(
        `/roles/${roleId}`,
      );
      if (detailRequestIdRef.current !== requestId) {
        return;
      }
      setSelectedRole(data.data ?? null);
    } catch {
      if (detailRequestIdRef.current === requestId) {
        setSelectedRole(null);
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setDetailLoading(false);
        setInitialLoadComplete(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!rolesLoaded) {
      return;
    }

    if (!selectedRoleId) {
      setSelectedRole(null);
      setDetailLoading(false);
      setInitialLoadComplete(true);
      return;
    }

    void loadRoleDetail(selectedRoleId);
  }, [loadRoleDetail, rolesLoaded, selectedRoleId]);

  const showInitialLoading = !initialLoadComplete && !error;

  if (showInitialLoading) {
    return <RolesManagementLoadingState />;
  }

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[#F7FBF5] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
      <CatalogPageHeader
        icon={ShieldCheck}
        title="Roles y permisos"
        description="Gestioná perfiles, permisos y accesos del sistema."
        total={meta.total}
        createLabel="Nuevo rol"
        canCreate={canCreate}
        onCreate={() => router.push("/roles/new")}
      />

      <section className="grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,.95fr)_minmax(420px,1.05fr)]">
        <div
          className={`min-h-0 flex-col gap-4 ${selectedRoleId ? "hidden lg:flex" : "flex"}`}
        >
          <div>
            <CatalogFilters
              query={query}
              status={status}
              searchPlaceholder="Buscar por nombre o descripcion..."
              onQueryChange={setQuery}
              onStatusChange={setStatus}
            />
          </div>
          {error ? <CatalogErrorState message={error} onRetry={() => setReloadToken((value) => value + 1)} /> : null}

          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            <div className="grid gap-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[94px] animate-pulse rounded-2xl border border-[#DDE8D7] bg-[#EEF6E9]"
                  />
                ))
              ) : roles.length > 0 ? (
                roles.map((role) => {
                  const selected = role.id === selectedRoleId;

                  return (
                    <AdminListCard
                      key={role.id}
                      onClick={() => {
                        setSelectedRole(null);
                        setDetailLoading(true);
                        setSelectedRoleId(role.id);
                      }}
                      selected={selected}
                      leading={<span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] font-extrabold text-white shadow-sm">{role.nombre.slice(0, 2).toUpperCase()}</span>}
                      title={role.nombre}
                      badges={<RoleStatusBadge activo={role.activo} />}
                      description={role.descripcion || "Sin descripción registrada"}
                      meta={`${role._count.permisos} permisos · ${role._count.usuarios} usuarios`}
                      trailing={<ChevronRight />}
                    />
                  );
                })
              ) : (
                <CatalogEmptyState title="No se encontraron roles." description="Modificá la búsqueda o el filtro de estado." filtered={Boolean(query.trim()) || status !== "all"} />
              )}
            </div>
          </div>

          <CatalogPagination page={page} total={meta.total} onPageChange={setPage} />
        </div>

        <div className={`min-h-0 ${selectedRoleId ? "block" : "hidden lg:block"}`}>
          {detailLoading && selectedRoleId ? (
            <AdminDetailPanel className="lg:h-full" loading loadingLabel="el detalle del rol" />
          ) : selectedRole ? (
            <AdminDetailPanel className="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden" onBack={() => { setSelectedRoleId(null); setSelectedRole(null); }}>
              <AdminDetailHeader
                title={selectedRole.nombre}
                leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-xl font-extrabold text-white shadow-sm">
                  {selectedRole.nombre.slice(0, 2).toUpperCase()}
                </span>}
                badge={<RoleStatusBadge activo={selectedRole.activo} />}
                action={<Button asChild variant="outline" className="w-full border-[var(--brand-secondary)] bg-white font-bold text-[var(--brand-primary)]"><Link href={`/roles/${selectedRole.id}/record/overview`}><Eye />Ver ficha completa</Link></Button>}
              />

              <div className="brand-scrollbar lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
              <dl className="mt-6 grid gap-3">
                <CatalogDetailField icon={KeyRound} label="Código interno">
                  {resolveRoleCode(selectedRole)}
                </CatalogDetailField>
                <CatalogDetailField icon={FileText} label="Descripcion">
                  {selectedRole.descripcion || "Sin descripcion"}
                </CatalogDetailField>
                <CatalogDetailField icon={KeyRound} label="Permisos asignados">
                  {selectedRole._count.permisos}
                </CatalogDetailField>
                <CatalogDetailField icon={Users} label="Usuarios asociados">
                  {selectedRole._count.usuarios}
                </CatalogDetailField>
              </dl>
              </div>

              {canEdit ? (
                <AdminDetailActions className="lg:shrink-0">
                  <Button
                    asChild
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
                  >
                    <Link href={`/roles/${selectedRole.id}/edit`}>
                      <Edit3 /> Editar
                    </Link>
                  </Button>
                </AdminDetailActions>
              ) : null}
            </AdminDetailPanel>
          ) : (
            <AdminDetailPanel empty="Seleccioná un rol para consultar su detalle y permisos." />
          )}
        </div>
      </section>
    </div>
  );
}
