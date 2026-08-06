import { Filter } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ManagedRole } from "../../types/management.types";

export function UsersRoleFilters({
  roles,
  selectedRoleId,
  onSelectRole,
  loading,
}: {
  roles: ManagedRole[];
  selectedRoleId: number | null;
  onSelectRole: (roleId: number | null) => void;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="h-11 w-full animate-pulse rounded-xl bg-[#F1F5EC]" />;
  }

  return (
    <Select
      value={selectedRoleId == null ? "all" : String(selectedRoleId)}
      onValueChange={(value) => onSelectRole(value === "all" ? null : Number(value))}
    >
      <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-[#F1F5EC] px-5 text-base text-[var(--brand-ink)] shadow-sm focus:ring-[var(--brand-secondary)]/25">
        <Filter className="mr-2 h-5 w-5 shrink-0 text-primary" />
        <SelectValue placeholder="Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos</SelectItem>
        {roles.map((role) => (
          <SelectItem key={role.id} value={String(role.id)}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
