"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Edit3,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  AdminDetailActions,
  AdminDetailHeader,
  AdminDetailPanel,
  AdminListCard,
  AdminListPane,
  AdminPageShell,
  AdminSplitLayout,
} from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import {
  CATALOG_PAGE_SIZE,
  CatalogDetailField,
  CatalogEmptyState,
  CatalogErrorState,
  CatalogFilterPopover,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearchInput,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";
import {
  listMedicalCoveragesClient,
  type MedicalCoverage,
} from "../services/medical-coverages.service";

type CoverageType = "all" | MedicalCoverage["tipo"];
type CoverageStatus = "all" | "active" | "inactive";

const typeLabels: Record<MedicalCoverage["tipo"], string> = {
  OBRA_SOCIAL: "Obra social",
  PREPAGA: "Prepaga",
};

export function MedicalCoveragesPage() {
  const router = useRouter();
  const params = useSearchParams();
  const canCreate = useCan("usuarios", "crear");
  const canEdit = useCan("usuarios", "editar");
  const [items, setItems] = useState<MedicalCoverage[]>([]);
  const [selectedId, setSelectedId] = useState(params.get("selected") ?? "");
  const [query, setQuery] = useState("");
  const [type, setType] = useState<CoverageType>("all");
  const [status, setStatus] = useState<CoverageStatus>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listMedicalCoveragesClient();
      setItems(data);
      setSelectedId((current) =>
        data.some((item) => item.id === current) ? current : data[0]?.id ?? "",
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "No pudimos cargar las coberturas médicas.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => setPage(1), [query, type, status]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (!normalizedQuery || item.nombre.toLowerCase().includes(normalizedQuery)) &&
        (type === "all" || item.tipo === type) &&
        (status === "all" || item.activo === (status === "active")),
    );
  }, [items, query, type, status]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const shown = filtered.slice(
    (page - 1) * CATALOG_PAGE_SIZE,
    page * CATALOG_PAGE_SIZE,
  );

  if (loading) {
    return <CatalogLoadingState label="obras sociales y prepagas" fullPage />;
  }

  return (
    <AdminPageShell>
      <CatalogPageHeader
        icon={HeartPulse}
        title="Obras sociales y prepagas"
        description="Administrá las coberturas médicas disponibles para los usuarios."
        total={items.length}
        createLabel="Nueva cobertura"
        canCreate={canCreate}
        onCreate={() => router.push("/medical-coverages/new")}
      />

      <AdminSplitLayout
        list={
          <AdminListPane detailOpen={Boolean(selectedId)}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <CatalogSearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por nombre..."
              />
              <CatalogFilterPopover
                sections={[
                  {
                    id: "coverage-type",
                    title: "Tipo",
                    value: type,
                    options: [
                      { value: "all", label: "Todos" },
                      { value: "OBRA_SOCIAL", label: "Obra social" },
                      { value: "PREPAGA", label: "Prepaga" },
                    ],
                    onChange: (value) => setType(value as CoverageType),
                  },
                  {
                    id: "coverage-status",
                    title: "Estado",
                    value: status,
                    options: [
                      { value: "all", label: "Todos" },
                      { value: "active", label: "Activas" },
                      { value: "inactive", label: "Inactivas" },
                    ],
                    onChange: (value) => setStatus(value as CoverageStatus),
                  },
                ]}
              />
            </div>

            {error ? (
              <CatalogErrorState
                message={error}
                onRetry={() => void load()}
              />
            ) : !filtered.length ? (
              <CatalogEmptyState
                title="No se encontraron coberturas."
                description="Creá una obra social o prepaga para ofrecerla en los formularios de usuarios."
                filtered={Boolean(query.trim()) || type !== "all" || status !== "all"}
              />
            ) : (
              <div className="flex min-h-0 flex-col gap-3">
                <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">
                  {shown.map((item) => (
                    <AdminListCard
                      key={item.id}
                      selected={selectedId === item.id}
                      onClick={() => setSelectedId(item.id)}
                      leading={item.imagenUrl ? <ActivityImagePreview source={item.imagenUrl} alt={`Avatar de ${item.nombre}`} className="size-12 rounded-xl object-contain p-1" /> :
                        <span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white">
                          {item.tipo === "PREPAGA" ? <ShieldCheck /> : <Building2 />}
                        </span>
                      }
                      title={item.nombre}
                      badges={<CoverageStatusBadge active={item.activo} />}
                      description={typeLabels[item.tipo]}
                      meta="Disponible en el perfil y alta de usuarios"
                      trailing={<ChevronRight />}
                    />
                  ))}
                </div>
                <CatalogPagination
                  page={page}
                  total={filtered.length}
                  onPageChange={setPage}
                />
              </div>
            )}
          </AdminListPane>
        }
        detail={
          <div className={cn(!selectedId && "hidden lg:block")}>
            <CoverageDetail
              item={selected}
              canEdit={canEdit}
              onBack={() => setSelectedId("")}
              onEdit={(id) => router.push(`/medical-coverages/${id}/edit`)}
            />
          </div>
        }
      />
    </AdminPageShell>
  );
}

function CoverageDetail({
  item,
  canEdit,
  onBack,
  onEdit,
}: {
  item: MedicalCoverage | null;
  canEdit: boolean;
  onBack: () => void;
  onEdit: (id: string) => void;
}) {
  if (!item) {
    return (
      <AdminDetailPanel empty="Seleccioná una cobertura para consultar su detalle." />
    );
  }

  return (
    <AdminDetailPanel onBack={onBack}>
      <AdminDetailHeader
        title={item.nombre}
        leading={item.imagenUrl ? <ActivityImagePreview source={item.imagenUrl} alt={`Avatar de ${item.nombre}`} className="size-16 rounded-2xl object-contain p-1" /> :
          <span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white">
            {item.tipo === "PREPAGA" ? (
              <ShieldCheck className="size-8" />
            ) : (
              <Building2 className="size-8" />
            )}
          </span>
        }
        badge={<CoverageStatusBadge active={item.activo} />}
      />
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={HeartPulse} label="Nombre">
          {item.nombre}
        </CatalogDetailField>
        <CatalogDetailField icon={ShieldCheck} label="Tipo de cobertura">
          {typeLabels[item.tipo]}
        </CatalogDetailField>
        <CatalogDetailField icon={Building2} label="Estado">
          {item.activo ? "Activa" : "Inactiva"}
        </CatalogDetailField>
      </dl>
      {canEdit ? (
        <AdminDetailActions>
          <Button
            onClick={() => onEdit(item.id)}
            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
          >
            <Edit3 /> Editar
          </Button>
        </AdminDetailActions>
      ) : null}
    </AdminDetailPanel>
  );
}

function CoverageStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold",
        active
          ? "bg-[#DDEBCF] text-[var(--brand-primary)]"
          : "bg-[#E4E7E5] text-[var(--brand-muted)]",
      )}
    >
      {active ? "Activa" : "Inactiva"}
    </span>
  );
}
