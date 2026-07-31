"use client";

import type { ColumnDef, Row } from "@tanstack/react-table";
import { FileUser, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { TableAction, TableActions } from "../../ui/table-actions";
import { axiosInstance } from "@/lib/axios";
import { formatApiMessage } from "@/utils/formatters";

type RowWithId = {
  id: string | number;
};

interface BuildActionsColumnOptions<T extends RowWithId> {
  component: string;
  label: string;
  onDeleted?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  showLegajo?: boolean;
  getExtraActions?: (row: T) => TableAction[];
}

export const buildActionsColumn = <T extends RowWithId>({
  component,
  label,
  onDeleted,
  canEdit = true,
  canDelete = true,
  showLegajo = true,
  getExtraActions,
}: BuildActionsColumnOptions<T>): ColumnDef<T> => ({
  id: "actions",
  header: "Acciones",
  cell: ({ row }: { row: Row<T> }) => {
    const original = row.original;
    const id = original.id;

    const actions: TableAction[] = [];

    if (canEdit) {
      actions.push({
        label: "Editar",
        icon: <Pencil className="h-4 w-4" />,
        href: `/${component}/${id}`,
      });
    }

    if (canDelete) {
      actions.push({
        label: "Eliminar",
        icon: <Trash2 className="h-4 w-4" />,
        confirmTitle: `¿Eliminar este ${label}?`,
        confirmDescription: `Esta acción eliminará permanentemente el ${label}. ¿Continuar?`,
        confirmActionLabel: "Eliminar",
        onConfirm: async () => {
          await axiosInstance.delete(`/${component}/${id}`);
          toast.success(
            formatApiMessage(`success.${component.slice(0, -1)}Deleted`),
          );
          onDeleted?.();
        },
      });
    }

    if (showLegajo) {
      actions.push({
        label: "Legajo",
        icon: <FileUser className="h-4 w-4" />,
        href: `/${component}/${id}/legajo`,
      });
    }

    if (getExtraActions) {
      actions.push(...getExtraActions(original));
    }

    if (actions.length === 0) {
      return null;
    }

    return <TableActions id={String(id)} actions={actions} />;
  },
});
