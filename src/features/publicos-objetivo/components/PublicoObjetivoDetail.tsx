"use client";

import {
  CalendarClock,
  Edit3,
  FileText,
  Hash,
  KeyRound,
  Power,
  PowerOff,
  UserRound,
  UsersRound,
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
import { formatSuggestedAgeRange } from "../helpers/age-range";
import type { PublicoObjetivo } from "../types/publico-objetivo.types";

const genderLabels: Record<PublicoObjetivo["generosAdmitidos"][number], string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  NO_BINARIO: "No binario",
  OTRO: "Otro",
  PREFIERE_NO_DECIR: "Prefiere no decir",
};

export function PublicoObjetivoDetail({
  item,
  canEdit,
  canChangeStatus,
  onBack,
  onEdit,
  onChangeStatus,
}: {
  item: PublicoObjetivo | null;
  canEdit: boolean;
  canChangeStatus: boolean;
  onBack: () => void;
  onEdit: () => void;
  onChangeStatus: () => void;
}) {
  if (!item) {
    return (
      <AdminDetailPanel empty="Seleccioná un público objetivo para consultar su detalle." />
    );
  }

  return (
    <AdminDetailPanel onBack={onBack}>
      <AdminDetailHeader
        title={item.nombre}
        leading={
          <span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-primary)] text-white shadow-sm">
            <UsersRound className="size-8" aria-hidden="true" />
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
        <CatalogDetailField icon={UserRound} label="Edad mínima sugerida">
          {item.edadMinimaSugerida ?? "Sin mínimo"}
        </CatalogDetailField>
        <CatalogDetailField icon={UserRound} label="Edad máxima sugerida">
          {item.edadMaximaSugerida ?? "Sin máximo"}
        </CatalogDetailField>
        <CatalogDetailField icon={UsersRound} label="Rango sugerido">
          {formatSuggestedAgeRange(
            item.edadMinimaSugerida,
            item.edadMaximaSugerida,
          )}
        </CatalogDetailField>
        <CatalogDetailField icon={UsersRound} label="Sexo / género admitido">
          {item.generosAdmitidos.length
            ? item.generosAdmitidos.map((gender) => genderLabels[gender]).join(", ")
            : "Todos"}
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
