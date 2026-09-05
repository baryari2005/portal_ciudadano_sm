"use client";

import { useUsersManagement } from "../../hooks/useUsersManagement";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";
import { CatalogFilterPopover } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { UserDetailPanel } from "./UserDetailPanel";
import { UsersHeader } from "./UsersHeader";
import { UsersList } from "./UsersList";
import { UsersManagementLoadingState } from "./UsersManagementLoadingState";
import { UsersSearchBar } from "./UsersSearchBar";
import { useSearchParams } from "next/navigation";

export function UsersManagementPage({ scope = "citizen", context = "admin" }: { scope?: "citizen" | "personnel"; context?: "admin" | "reception" }) {
  const searchParams = useSearchParams();
  const canCreate = useCan("usuarios", "crear");
  const {
    query,
    setQuery,
    users,
    roles,
    rolesLoading,
    selectedRoleId,
    setSelectedRoleId,
    selectedStatus,
    setSelectedStatus,
    meta,
    selectedUser,
    selectedUserId,
    selectUser,
    refreshUsers,
    page,
    setPage,
    loading,
    initialized,
    error,
  } = useUsersManagement(scope, context, searchParams.get("selected") ?? "");
  const showInitialLoading = (!initialized || rolesLoading) && !error;

  if (showInitialLoading) {
    return <UsersManagementLoadingState />;
  }

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
      <UsersHeader total={meta.total} canCreate={canCreate} scope={scope} context={context} />

      <section className="grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
        <div
          className={cn(
            "min-h-0 flex-col gap-4",
            selectedUserId ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <UsersSearchBar value={query} onChange={setQuery} />
            </div>
            <CatalogFilterPopover sections={[
              { id: "user-role", title: "Rol", value: selectedRoleId == null ? "all" : String(selectedRoleId), options: [{ value: "all", label: "Todos" }, ...roles.map((role) => ({ value: String(role.id), label: role.name }))], onChange: (value) => setSelectedRoleId(value === "all" ? null : Number(value)) },
              { id: "user-status", title: "Estado", value: selectedStatus, options: [{ value: "all", label: "Todos" }, { value: "active", label: "Activos" }, { value: "inactive", label: "Inactivos" }], onChange: (value) => setSelectedStatus(value as typeof selectedStatus) },
            ]} />
          </div>
          <UsersList
            users={users}
            selectedUserId={selectedUserId}
            onSelectUser={selectUser}
            meta={meta}
            page={page}
            onPageChange={setPage}
            loading={loading}
            error={error}
            filtered={Boolean(query.trim()) || selectedRoleId !== null || selectedStatus !== "all"}
          />
        </div>
        <div
          className={cn(
            !selectedUserId && "hidden lg:block",
            "min-h-0",
          )}
        >
          <UserDetailPanel
            user={selectedUser}
            loading={loading}
            onBack={() => selectUser("")}
            onUserChanged={refreshUsers}
            compact
            context={context}
            scope={scope}
          />
        </div>
      </section>
    </div>
  );
}
