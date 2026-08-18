"use client";

import { useEffect, useMemo, useState } from "react";
import { CATALOG_PAGE_SIZE } from "@/features/activity-catalogs/components/CatalogPrimitives";

import {
  listManagedRoles,
  listManagedUsers,
} from "../services/users-management.service";
import type {
  ManagedRole,
  ManagedUser,
  UserManagementMeta,
} from "../types/management.types";

const emptyMeta: UserManagementMeta = {
  total: 0,
  page: 1,
  pageSize: CATALOG_PAGE_SIZE,
  pageCount: 1,
};

export function useUsersManagement(scope: "citizen" | "personnel" = "citizen", context: "admin" | "reception" = "admin", initialSelectedUserId = "") {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [meta, setMeta] = useState<UserManagementMeta>(emptyMeta);
  const [selectedUserId, setSelectedUserId] = useState(initialSelectedUserId);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [roles, setRoles] = useState<ManagedRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [query, selectedRoleId, selectedStatus]);

  useEffect(() => {
    let active = true;

    async function fetchRoles() {
      if (context === "reception") { setRoles([]); setRolesLoading(false); return; }
      setRolesLoading(true);

      try {
        const allRoles = await listManagedRoles();
        const isCitizenRole = (role: ManagedRole) => {
          const code = role.code.trim().toLowerCase();
          const name = role.name.trim().toLowerCase();
          return ["user", "usuario", "citizen", "ciudadano"].includes(code) || ["user", "usuario", "ciudadano"].includes(name);
        };
        const nextRoles = allRoles.filter((role) => scope === "citizen" ? isCitizenRole(role) : !isCitizenRole(role));

        if (active) {
          setRoles(nextRoles);
        }
      } catch {
        if (active) {
          setRoles([]);
        }
      } finally {
        if (active) {
          setRolesLoading(false);
        }
      }
    }

    void fetchRoles();

    return () => {
      active = false;
    };
  }, [scope, context]);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await listManagedUsers({
          q: query,
          page,
          pageSize: CATALOG_PAGE_SIZE,
          roleId: selectedRoleId,
          status: selectedStatus,
          scope,
        });

        if (!active) {
          return;
        }

        setUsers(response.users);
        setMeta(response.meta);
        setSelectedUserId((current) => {
          if (response.users.some((user) => user.id === current)) {
            return current;
          }

          return "";
        });
      } catch {
        if (active) {
          setUsers([]);
          setMeta(emptyMeta);
          setError("No pudimos cargar los usuarios.");
        }
      } finally {
        if (active) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, page, selectedRoleId, selectedStatus, refreshIndex, scope]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [selectedUserId, users],
  );

  return {
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
    selectUser: setSelectedUserId,
    refreshUsers: () => setRefreshIndex((value) => value + 1),
    page,
    setPage,
    loading,
    initialized,
    error,
    pageSize: CATALOG_PAGE_SIZE,
  };
}
