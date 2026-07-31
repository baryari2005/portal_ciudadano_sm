"use client";

import {
  CalendarClock,
  Edit3,
  FileText,
  Hash,
  KeyRound,
  Palette,
  Power,
  PowerOff,
  Shapes,
} from "lucide-react";

import {
  AdminDetailActions,
  AdminDetailHeader,
  AdminDetailPanel,
} from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import {
  CatalogDetailField,
  CatalogStatusBadge,
  formatCatalogDate,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { getCategoryIcon } from "../helpers/categoria-icons";
import type { CategoriaActividad } from "../types/categoria-actividad.types";

export function CategoriaActividadDetail({
  item,
  canEdit,
  canChangeStatus,
  onBack,
  onEdit,
  onChangeStatus,
}: {
  item: CategoriaActividad | null;
  canEdit: boolean;
  canChangeStatus: boolean;
  onBack: () => void;
  onEdit: () => void;
  onChangeStatus: () => void;
}) {
  if (!item) {
    return (
      <AdminDetailPanel empty="Seleccioná una categoría para consultar su detalle." />
    );
  }

  const Icon = getCategoryIcon(item.icono);
  const color = item.color || "#1D4F36";

  return (
    <AdminDetailPanel onBack={onBack}>
      <AdminDetailHeader
        title={item.nombre}
        leading={
          <span
            className="grid size-16 place-items-center rounded-2xl text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Icon className="size-8" aria-hidden="true" />
          </span>
        }
        badge={<CatalogStatusBadge active={item.activo} />}
      />

      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={KeyRound} label="Slug">
          <span className="font-mono">{item.slug}</span>
        </CatalogDetailField>
        <CatalogDetailField icon={FileText} label="Descripción">
          {item.descripcion || "Sin descripción"}
        </CatalogDetailField>
        <CatalogDetailField icon={Palette} label="Color">
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-4 rounded-full border border-black/15"
              style={{ backgroundColor: color }}
            />
            {item.color || "Sin color asignado"}
          </span>
        </CatalogDetailField>
        <CatalogDetailField icon={Shapes} label="Icono">
          {item.icono || "Sin icono asignado"}
        </CatalogDetailField>
        <CatalogDetailField icon={Hash} label="Orden">
          {item.orden}
        </CatalogDetailField>
        <CatalogDetailField icon={CalendarClock} label="Creación">
          {formatCatalogDate(item.createdAt)}
        </CatalogDetailField>
        <CatalogDetailField icon={CalendarClock} label="Última actualización">
          {formatCatalogDate(item.updatedAt)}
        </CatalogDetailField>
      </dl>

      {canEdit || canChangeStatus ? (
        <AdminDetailActions>
          {canEdit ? (
            <Button
              type="button"
              onClick={onEdit}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"
            >
              <Edit3 /> Editar
            </Button>
          ) : null}
          {canChangeStatus ? (
            <Button
              type="button"
              variant="outline"
              onClick={onChangeStatus}
              className={
                item.activo
                  ? "text-red-700 hover:bg-red-50"
                  : "text-[var(--brand-primary)]"
              }
            >
              {item.activo ? <PowerOff /> : <Power />}
              {item.activo ? "Desactivar" : "Reactivar"}
            </Button>
          ) : null}
        </AdminDetailActions>
      ) : null}
    </AdminDetailPanel>
  );
}
