// src/components/users/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buildActionsColumn } from "@/components/data-display/table/BuildActionsColumn";
import { UserRow } from "../types/types";
import { UserStatusActions } from "./UserStatusActions";
import { UserStatusBadge } from "./UserStatusBadge";

// Exportá una función para poder pasar onDeleted
export const getUserColumns = (
  onDeleted?: () => void,
  canDelete?: boolean,
  canEdit?: boolean,
): ColumnDef<UserRow>[] => [
  {
    id: "avatar",
    header: "Avatar",
    cell: ({ row }) => {
      const display =
        [row.original.nombre, row.original.apellido]
          .filter(Boolean)
          .join(" ") || row.original.userId;
      const initials = display.slice(0, 2).toUpperCase();
      const imageUrl = row.original.avatarUrl ?? undefined;

      return (
        <Avatar className="h-8 w-8">
          <AvatarImage src={imageUrl} alt={display} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      );
    },
    enableSorting: false,
  },
  { accessorKey: "userId", header: "Usuario", enableSorting: true },
  {
    accessorKey: "nombre",
    header: "Nombre",
    enableSorting: true,
    cell: ({ row }) =>
      row.original.nombre ?? (
        <span className="italic text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "apellido",
    header: "Apellido",
    enableSorting: true,
    cell: ({ row }) =>
      row.original.apellido ?? (
        <span className="italic text-muted-foreground">—</span>
      ),
  },
  { accessorKey: "email", header: "Email", enableSorting: true },
  {
    id: "rol",
    header: "Rol",
    cell: ({ row }) =>
      row.original.rol?.nombre ?? (
        <span className="italic text-muted-foreground">Sin rol</span>
      ),
    enableSorting: false,
  },
  {
    id: "estado",
    header: "Estado",
    cell: ({ row }) => <UserStatusBadge status={row.original.estado} />,
    enableSorting: false,
  },
  {
    id: "aprobacion",
    header: "Aprobación",
    cell: ({ row }) =>
      canEdit ? (
        <UserStatusActions
          userId={row.original.id}
          status={row.original.estado}
          onChanged={onDeleted}
        />
      ) : null,
    enableSorting: false,
  },
  buildActionsColumn({
    component: "users",
    label: "usuario",
    onDeleted,
    canDelete,
    canEdit,
  }),
];
