"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckSquare,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Edit3,
  FileCheck2,
  FileText,
  Hash,
  Info,
  ListOrdered,
  PackageCheck,
  Power,
  PowerOff,
  ScrollText,
  type LucideIcon,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  CatalogDetailField,
  CatalogEmptyState,
  CatalogErrorState,
  CatalogFilterPopover,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearchInput,
  CatalogStatusBadge,
  CATALOG_PAGE_SIZE,
  formatCatalogDate,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import {
  deactivateRequirementClient,
  listRequirementsClient,
  reactivateRequirementClient,
} from "../services/requirements.service";
import type { Requirement } from "../types/requirement.types";

const TYPES: Record<Requirement["tipo"], string> = {
  INFORMACION: "Información",
  DOCUMENTO: "Documento",
  CONSENTIMIENTO: "Consentimiento",
  ELEMENTO_PERSONAL: "Elemento personal",
  CONDICION: "Condición o indicación",
};
const TYPE_ICONS: Record<Requirement["tipo"], LucideIcon> = {
  INFORMACION: Info,
  DOCUMENTO: FileCheck2,
  CONSENTIMIENTO: ClipboardCheck,
  ELEMENTO_PERSONAL: PackageCheck,
  CONDICION: CircleAlert,
};

export function RequirementsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const canCreate = useCan("requirements", "crear");
  const canEdit = useCan("requirements", "editar");
  const canChangeStatus = useCan("requirements", "eliminar");
  const [items, setItems] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(params.get("selected") ?? "");
  const [page, setPage] = useState(1);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  async function load(preferredId?: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await listRequirementsClient();
      setItems(data);
      setSelectedId((current) => {
        const next = preferredId ?? current;
        return data.some((item) => item.id === next) ? next : data[0]?.id ?? "";
      });
    } catch {
      setError("No pudimos cargar los requisitos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => setPage(1), [query, type, status, documentFilter]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter(
      (item) =>
        (!normalizedQuery ||
          `${item.nombre} ${item.slug} ${item.descripcion ?? ""}`
            .toLowerCase()
            .includes(normalizedQuery)) &&
        (type === "all" || item.tipo === type) &&
        (status === "all" || item.activo === (status === "active")) &&
        (documentFilter === "all" ||
          item.requiereDocumento === (documentFilter === "yes")),
    );
  }, [items, query, type, status, documentFilter]);
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const shown = filtered.slice(
    (page - 1) * CATALOG_PAGE_SIZE,
    page * CATALOG_PAGE_SIZE,
  );

  async function toggleStatus() {
    if (!selected) return;
    setChanging(true);
    try {
      const saved = await (selected.activo
        ? deactivateRequirementClient(selected.id)
        : reactivateRequirementClient(selected.id));
      setConfirmOpen(false);
      await load(saved.id);
    } catch {
      toast.error("No pudimos cambiar el estado del requisito.");
    } finally {
      setChanging(false);
    }
  }

  if (loading && !items.length) {
    return <CatalogLoadingState label="requisitos" fullPage />;
  }

  return (
    <AdminPageShell>
      <CatalogPageHeader
        icon={ScrollText}
        title="Requisitos"
        description="Administrá documentos, elementos personales, consentimientos y condiciones para las actividades."
        total={items.length}
        createLabel="Nuevo requisito"
        canCreate={canCreate}
        onCreate={() => router.push("/requirements/new")}
      />

      <AdminSplitLayout
        list={
          <AdminListPane detailOpen={Boolean(selectedId)}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <CatalogSearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar por nombre, slug o descripción..."
              />
              <CatalogFilterPopover
                sections={[
                  {
                    id: "requirement-type",
                    title: "Tipo",
                    value: type,
                    options: [
                      { value: "all", label: "Todos" },
                      ...Object.entries(TYPES).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    ],
                    onChange: setType,
                  },
                  {
                    id: "requirement-status",
                    title: "Estado",
                    value: status,
                    options: [
                      { value: "all", label: "Todos" },
                      { value: "active", label: "Activos" },
                      { value: "inactive", label: "Inactivos" },
                    ],
                    onChange: setStatus,
                  },
                  {
                    id: "requirement-document",
                    title: "Documento",
                    value: documentFilter,
                    options: [
                      { value: "all", label: "Todos" },
                      { value: "yes", label: "Requiere documento" },
                      { value: "no", label: "No requiere documento" },
                    ],
                    onChange: setDocumentFilter,
                  },
                ]}
              />
            </div>

            {error ? (
              <CatalogErrorState message={error} onRetry={() => void load()} />
            ) : !filtered.length ? (
              <CatalogEmptyState
                title="No se encontraron requisitos."
                description="Creá un requisito para asociarlo con las actividades."
                filtered={
                  Boolean(query.trim()) ||
                  type !== "all" ||
                  status !== "all" ||
                  documentFilter !== "all"
                }
              />
            ) : (
              <div className="flex min-h-0 flex-col gap-3">
                <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">
                  {shown.map((item) => {
                    const Icon = TYPE_ICONS[item.tipo];
                    return (
                      <AdminListCard
                        key={item.id}
                        selected={item.id === selectedId}
                        onClick={() => setSelectedId(item.id)}
                        className={cn(!item.activo && "opacity-70")}
                        leading={
                          <span className="grid size-12 place-items-center rounded-xl bg-[var(--brand-primary)] text-white">
                            <Icon className="size-6" />
                          </span>
                        }
                        title={item.nombre}
                        badges={
                          <CatalogStatusBadge
                            active={item.activo}
                            activeLabel="Activo"
                            inactiveLabel="Inactivo"
                          />
                        }
                        description={item.descripcion || "Sin descripción"}
                        meta={
                          <span className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{TYPES[item.tipo]}</Badge>
                            {item.requiereDocumento ? (
                              <Badge variant="secondary">Documento requerido</Badge>
                            ) : null}
                            <span className="flex items-center gap-1">
                              <Hash className="size-3.5" /> Orden {item.orden}
                            </span>
                          </span>
                        }
                        trailing={<ChevronRight />}
                      />
                    );
                  })}
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
            {loading && selectedId ? (
              <AdminDetailPanel loading loadingLabel="el detalle" />
            ) : (
              <RequirementDetail
                item={selected}
                canEdit={canEdit}
                canChangeStatus={canChangeStatus}
                onBack={() => setSelectedId("")}
                onEdit={(id) => router.push(`/requirements/${id}/edit`)}
                onChangeStatus={() => setConfirmOpen(true)}
              />
            )}
          </div>
        }
      />

      <ConfirmDialog
        open={confirmOpen}
        title={selected?.activo ? "Desactivar requisito" : "Reactivar requisito"}
        description="Las asociaciones existentes con actividades se conservarán."
        confirmLabel={selected?.activo ? "Desactivar" : "Reactivar"}
        loading={changing}
        icon={selected?.activo ? <PowerOff /> : <Power />}
        onClose={() => !changing && setConfirmOpen(false)}
        onConfirm={toggleStatus}
      />
    </AdminPageShell>
  );
}

function RequirementDetail({
  item,
  canEdit,
  canChangeStatus,
  onBack,
  onEdit,
  onChangeStatus,
}: {
  item: Requirement | null;
  canEdit: boolean;
  canChangeStatus: boolean;
  onBack: () => void;
  onEdit: (id: string) => void;
  onChangeStatus: () => void;
}) {
  if (!item) {
    return <AdminDetailPanel empty="Seleccioná un requisito para consultar su detalle." />;
  }
  const Icon = TYPE_ICONS[item.tipo];
  return (
    <AdminDetailPanel onBack={onBack}>
      <AdminDetailHeader
        title={item.nombre}
        leading={
          <span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white">
            <Icon className="size-8" />
          </span>
        }
        badge={
          <CatalogStatusBadge
            active={item.activo}
            activeLabel="Activo"
            inactiveLabel="Inactivo"
          />
        }
      />
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={FileText} label="Slug">{item.slug}</CatalogDetailField>
        <CatalogDetailField icon={Icon} label="Tipo">{TYPES[item.tipo]}</CatalogDetailField>
        <CatalogDetailField icon={Info} label="Descripción">{item.descripcion || "Sin descripción"}</CatalogDetailField>
        <CatalogDetailField icon={CheckSquare} label="Carácter">{item.obligatoriedad === "OBLIGATORIO" ? "Obligatorio" : "Recomendado"}</CatalogDetailField>
        <CatalogDetailField icon={FileText} label="Instrucciones">{item.instrucciones || "Sin instrucciones"}</CatalogDetailField>
        <CatalogDetailField icon={FileCheck2} label="Documento">{item.requiereDocumento ? "Requerido" : "No requerido"}</CatalogDetailField>
        {item.tipo === "DOCUMENTO" ? <CatalogDetailField icon={FileCheck2} label="Documento personal">{item.documentoPersonal ? "Sí" : "No"}</CatalogDetailField> : null}
        {item.tipo === "DOCUMENTO" ? <CatalogDetailField icon={ClipboardCheck} label="Vencimiento">{item.tieneVencimiento ? `${item.vigenciaDias ?? 0} días de vigencia · aviso ${item.diasAvisoVencimiento} días antes` : "Sin vencimiento"}</CatalogDetailField> : null}
        <CatalogDetailField icon={CheckSquare} label="Confirmación del usuario">{item.requiereConfirmacion ? "Requerida" : "No requerida"}</CatalogDetailField>
        <CatalogDetailField icon={ClipboardCheck} label="Control al ingresar">{item.controlarAlIngreso ? "Sí" : "No"}</CatalogDetailField>
        {item.tipo === "ELEMENTO_PERSONAL" ? <CatalogDetailField icon={PackageCheck} label="Provisión">{item.provistoPorInstitucion ? "Lo proporciona la institución" : "Debe llevarlo la persona"}</CatalogDetailField> : null}
        {item.tipo === "ELEMENTO_PERSONAL" ? <CatalogDetailField icon={ClipboardCheck} label="Frecuencia">{item.aplicaEnCadaClase ? "Se requiere en cada clase" : "No se controla en cada clase"}</CatalogDetailField> : null}
        <CatalogDetailField icon={ListOrdered} label="Orden">{item.orden}</CatalogDetailField>
        <CatalogDetailField icon={FileText} label="Creación">{formatCatalogDate(item.createdAt)}</CatalogDetailField>
        <CatalogDetailField icon={FileText} label="Actualización">{formatCatalogDate(item.updatedAt)}</CatalogDetailField>
      </dl>
      {canEdit || canChangeStatus ? (
        <AdminDetailActions>
          {canEdit ? <Button onClick={() => onEdit(item.id)} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"><Edit3 /> Editar</Button> : null}
          {canChangeStatus ? <Button variant="outline" onClick={onChangeStatus} className={item.activo ? "text-red-700 hover:bg-red-50" : "text-[var(--brand-primary)]"}>{item.activo ? <PowerOff /> : <Power />}{item.activo ? "Desactivar" : "Reactivar"}</Button> : null}
        </AdminDetailActions>
      ) : null}
    </AdminDetailPanel>
  );
}
