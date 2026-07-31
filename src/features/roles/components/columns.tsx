"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { RoleStatusBadge } from "@/features/roles/components/RoleStatusBadge";
import type { Role } from "@/features/roles/types/types";
import { Edit3 } from "lucide-react";

export function getRoleColumns(canEdit: boolean): ColumnDef<Role>[] {
  return [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.nombre}</span>
      ),
    },
    {
      accessorKey: "descripcion",
      header: "Descripción",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.descripcion ?? "-"}
        </span>
      ),
    },
    {
      accessorKey: "activo",
      header: "Estado",
      cell: ({ row }) => <RoleStatusBadge activo={row.original.activo} />,
    },
    {
      id: "permisos",
      header: "Permisos",
      cell: ({ row }) => row.original._count?.permisos ?? 0,
    },
    {
      id: "usuarios",
      header: "Usuarios",
      cell: ({ row }) => row.original._count?.usuarios ?? 0,
    },
    {
      id: "acciones",
      header: () => <div className="text-right">Acciones</div>,
      cell: ({ row }) => (
        <div className="text-left">
          {canEdit ? (
            <Link
              href={`/roles/${row.original.id}`}
              className="text-primary hover:underline flex"
            >
              <Edit3 className="w-4 h-4 mr-2 items-center justify-center" />
              Editar
            </Link>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
  ];
}
