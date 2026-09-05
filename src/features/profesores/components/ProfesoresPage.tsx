"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  Edit3,
  FileText,
  GraduationCap,
  IdCard,
  Mail,
  Power,
  PowerOff,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminDetailActions } from "@/components/shared/admin-patterns";
import {
  CatalogEmptyState,
  CatalogErrorState,
  CatalogDetailField,
  CatalogLoadingState,
  CatalogPagination,
  CatalogPageHeader,
  CatalogFilterPopover,
  CatalogSearchInput,
  CATALOG_PAGE_SIZE,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { useProfesorMutations } from "../hooks/useProfesorMutations";
import { useProfesor, useProfesores } from "../hooks/useProfesores";
import type { Profesor, ProfesorEstado } from "../types/profesor.types";
import { ProfesorAvatar } from "./ProfesorAvatar";
import { ProfesorStatusBadge } from "./ProfesorStatusBadge";

const fullName = (p: Profesor) =>
  [p.usuario.nombre, p.usuario.apellido].filter(Boolean).join(" ") ||
  p.usuario.email;
const date = (value: string) =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(value),
  );

export function ProfesoresPage() {
  const router = useRouter();
  const [search, setSearch] = useState(""),
    [estado, setEstado] = useState<ProfesorEstado | "TODOS">("TODOS"),
    [pendingStatus, setPendingStatus] = useState<ProfesorEstado | null>(null),
    [page, setPage] = useState(1);
  const canCreate = useCan("profesores", "crear"),
    canEdit = useCan("profesores", "editar"),
    canState = useCan("profesores", "eliminar");
  const list = useProfesores(search, estado),
    detail = useProfesor(list.selectedId),
    mutations = useProfesorMutations();
  const selected = detail.item;
  const pageItems = list.items.slice(
    (page - 1) * CATALOG_PAGE_SIZE,
    page * CATALOG_PAGE_SIZE,
  );

  useEffect(() => setPage(1), [search, estado]);

  if (list.loading) {
    return <CatalogLoadingState label="profesores" fullPage />;
  }

  async function status(next: ProfesorEstado) {
    if (!selected) return;
    const saved =
      next === "INACTIVO"
        ? await mutations.deactivate(selected.id)
        : await mutations.changeStatus(selected.id, next);
    await list.refresh(saved.id);
    await detail.refresh();
    setPage(1);
    setPendingStatus(null);
  }
  return (
    <div className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] p-4 sm:p-6 lg:p-8">
      <CatalogPageHeader
        icon={GraduationCap}
        title="Profesores y responsables"
        description="Administrá los perfiles profesionales asociados a usuarios del sistema."
        total={list.items.length}
        createLabel="Crear profesor"
        canCreate={canCreate}
        onCreate={() => router.push("/teachers/new")}
      />
      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(340px,.9fr)_minmax(430px,1.1fr)]">
        <div className={cn("space-y-4", list.selectedId && "hidden lg:block")}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <CatalogSearchInput value={search} onChange={setSearch} placeholder="Buscar profesor..." />
            <CatalogFilterPopover sections={[{ id: "teacher-status", title: "Estado", value: estado === "TODOS" ? "all" : estado, options: [{ value: "all", label: "Todos" }, { value: "ACTIVO", label: "Activo" }, { value: "INACTIVO", label: "Inactivo" }], onChange: (value) => setEstado((value === "all" ? "TODOS" : value) as typeof estado) }]} />
          </div>
          {list.error ? (
            <CatalogErrorState message={list.error} onRetry={() => void list.refresh()} />
          ) : !list.items.length ? (
            <CatalogEmptyState
              title="No se encontraron profesores."
              description="Creá un perfil profesional asociándolo a un usuario existente."
              filtered={Boolean(search) || estado !== "TODOS"}
            />
          ) : (
            <div className="flex min-h-0 flex-col gap-3">
              <div className="space-y-3 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)] lg:overflow-y-auto">
              {pageItems.map((p) => (
                <button
                  key={p.id}
                  onClick={() => list.setSelectedId(p.id)}
                  className={cn(
                    "grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]",
                    list.selectedId === p.id
                      ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] shadow-sm"
                      : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)] hover:shadow-sm",
                  )}
                  data-admin-list-card=""
                >
                  <ProfesorAvatar profesor={p} className="h-12 w-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold text-[var(--brand-ink)]">
                      {fullName(p)}
                    </span>
                    <span className="mt-1 block truncate text-sm font-medium text-[var(--brand-text)]">
                      {p.especialidad || "Sin especialidad"}
                    </span>
                    <span className="mt-2 block truncate text-xs font-medium text-[var(--brand-muted)]">
                      DNI {p.usuario.dni || "—"} ·{" "}
                      {p.matricula || p.usuario.email}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ProfesorStatusBadge estado={p.estado} />
                    <ChevronRight className="size-5 text-[var(--brand-secondary)]" />
                  </span>
                </button>
              ))}
              </div>
              <CatalogPagination
                page={page}
                total={list.items.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
        <div className={cn(!list.selectedId && "hidden lg:block")}>
          {detail.loading ? (
            <CatalogLoadingState label="el detalle" />
          ) : detail.error ? (
            <CatalogErrorState
              message={detail.error}
              onRetry={() => void detail.refresh()}
            />
          ) : selected ? (
            <aside className="h-fit overflow-hidden rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 text-[var(--brand-ink)] shadow-sm sm:p-7">
              <Button
                variant="ghost"
                className="mb-4 -ml-2 text-[var(--brand-primary)] lg:hidden"
                onClick={() => list.setSelectedId(null)}
              >
                <ArrowLeft /> Volver al listado
              </Button>
              <div className="flex items-start gap-4">
                <ProfesorAvatar profesor={selected} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-2xl font-extrabold text-[var(--brand-primary)]">
                    {fullName(selected)}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ProfesorStatusBadge estado={selected.estado} />
                    <span className="rounded-full border border-[var(--brand-border)] bg-white px-2.5 py-0.5 text-xs font-bold text-[var(--brand-primary)]">
                      {selected.usuario.rol.nombre}
                    </span>
                  </div>
                </div>
              </div>

              <dl className="mt-6 grid gap-3">
                <CatalogDetailField icon={GraduationCap} label="Especialidad">
                  {selected.especialidad || "Sin especialidad"}
                </CatalogDetailField>
                <CatalogDetailField icon={IdCard} label="Matrícula">
                  {selected.matricula || "—"}
                </CatalogDetailField>
                <CatalogDetailField icon={IdCard} label="DNI">
                  {selected.usuario.dni || "—"}
                </CatalogDetailField>
                <CatalogDetailField icon={Mail} label="Email">
                  {selected.usuario.email}
                </CatalogDetailField>
                <CatalogDetailField icon={Phone} label="Teléfono">
                  {selected.usuario.telefono || "—"}
                </CatalogDetailField>
                <CatalogDetailField icon={FileText} label="Descripción">
                  <span className="whitespace-pre-wrap">
                    {selected.descripcion || "Sin descripción."}
                  </span>
                </CatalogDetailField>
                <CatalogDetailField icon={CalendarClock} label="Fecha de alta">
                  {date(selected.createdAt)}
                </CatalogDetailField>
                <CatalogDetailField icon={CalendarClock} label="Última actualización">
                  {date(selected.updatedAt)}
                </CatalogDetailField>
              </dl>

                <AdminDetailActions>
                  {canEdit && (
                    <Button
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
                      onClick={() => router.push(`/teachers/${selected.id}/edit`)}
                    >
                      <Edit3 /> Editar
                    </Button>
                  )}
                  {canState && selected.estado !== "ACTIVO" && (
                    <Button
                      onClick={() => setPendingStatus("ACTIVO")}
                      disabled={mutations.loading}
                    >
                      Activar
                    </Button>
                  )}
                  {canState && selected.estado !== "INACTIVO" && (
                    <Button
                      variant="outline"
                      onClick={() => setPendingStatus("INACTIVO")}
                      disabled={mutations.loading}
                    >
                      Desactivar
                    </Button>
                  )}
                </AdminDetailActions>
            </aside>
          ) : (
            <aside className="hidden h-full min-h-72 items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-8 text-center text-sm font-semibold text-[var(--brand-text)]/70 lg:flex">
              Seleccioná un profesor para consultar su detalle.
            </aside>
          )}
        </div>
      </section>
      <ConfirmDialog
        open={pendingStatus !== null}
        title={
          pendingStatus === "ACTIVO"
            ? "Activar profesor"
            : "Desactivar profesor"
        }
        description={
          pendingStatus === "ACTIVO"
            ? "El profesor volverá a estar disponible en el sistema."
            : "El profesor dejará de estar disponible en las selecciones activas."
        }
        confirmLabel={
          pendingStatus === "ACTIVO"
            ? "Activar"
            : "Desactivar"
        }
        icon={
          pendingStatus === "ACTIVO" ? (
            <Power />
          ) : (
            <PowerOff />
          )
        }
        loading={mutations.loading}
        onClose={() => !mutations.loading && setPendingStatus(null)}
        onConfirm={() => {
          if (pendingStatus) return status(pendingStatus);
        }}
      />
    </div>
  );
}
