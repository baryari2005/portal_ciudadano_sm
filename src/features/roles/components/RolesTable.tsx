"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ShieldPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getRoleColumns } from "@/features/roles/components/columns";
import { useCan } from "@/hooks/useCan";
import { GenericListWithTable } from "@/components/data-display/table/GenericListWithTable";
import { GenericDataTable } from "@/components/data-display/table/GenericDataTable";
import { Role, RolesListProps } from "../types/types";

type RoleResponse = {
  data?: Role[];
  meta?: {
    total?: number;
    pageCount?: number;
  };
};

export function RolesList({ search = "", refresh }: RolesListProps) {
  const endPoint = "/roles";

  const canEdit = useCan("roles", "editar");
  const canCreate = useCan("roles", "crear");

  const columns = useMemo(() => getRoleColumns(canEdit), [canEdit]);

  if (process.env.NODE_ENV !== "production") {
    console.log("[RolesList] endpoint →", endPoint);
  }

  return (
    <GenericListWithTable<Role>
      endpoint={endPoint}
      columns={columns}
      externalSearch={search}
      refreshToken={`${refresh ?? ""}`}
      pageSize={10}
      paramNames={{
        search: "q",
        page: "page",
        limit: "pageSize",
        sortBy: "sortBy",
        sortDir: "sortDir",
      }}
      responseAdapter={(raw) => {
        const typed = raw as RoleResponse;

        return {
          items: typed.data ?? [],
          total: typed.meta?.total ?? 0,
          pageCount: typed.meta?.pageCount,
        };
      }}
      toolbarActions={
        canCreate ? (
          <Button
            asChild
            size="lg"
            className="h-12 rounded-xl bg-[#00522C] px-6 font-bold text-white shadow-sm hover:bg-[#003A22]"
          >
            <Link href="/roles/new">
              <ShieldPlus className="h-4 w-4" />
              Nuevo rol
            </Link>
          </Button>
        ) : undefined
      }
      DataTableComponent={(props) => (
        <GenericDataTable
          {...props}
          searchPlaceholder="Buscar por nombre o descripción"
        />
      )}
    />
  );
}
