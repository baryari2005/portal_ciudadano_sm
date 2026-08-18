import { AdminEmptyState } from "@/components/shared/admin-patterns";
import { CatalogPagination } from "@/features/activity-catalogs/components/CatalogPrimitives";

import type {
  ManagedUser,
  UserManagementMeta,
} from "../../types/management.types";
import { UserListItem } from "./UserListItem";

type UsersListProps = {
  users: ManagedUser[];
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  meta: UserManagementMeta;
  page: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  error: string | null;
  filtered: boolean;
};

export function UsersList({
  users,
  selectedUserId,
  onSelectUser,
  meta,
  page,
  onPageChange,
  loading,
  error,
  filtered,
}: UsersListProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col">
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="grid gap-3">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[120px] animate-pulse rounded-[20px] border border-[var(--brand-border-soft)] bg-[var(--brand-panel)]"
                  />
                ))
              : users.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    selected={user.id === selectedUserId}
                    onSelect={onSelectUser}
                  />
                ))}
          </div>

          {!loading && !error && users.length === 0 ? (
            <AdminEmptyState
              title="No hay usuarios registrados."
              description="Los usuarios creados o aprobados aparecerán en este listado."
              filtered={filtered}
            />
          ) : null}
        </div>

        <CatalogPagination page={page} total={meta.total} pageSize={meta.pageSize} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
