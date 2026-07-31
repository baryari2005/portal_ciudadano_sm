"use client";

import { useMemo, useState } from "react";

import { filterManagedUsers } from "../helpers/user-management.helpers";
import type { ManagedUser } from "../types/management.types";

const MOCK_USERS: ManagedUser[] = [
  {
    id: "usr_1",
    userId: "smanzoni",
    fullName: "Sergio Ariel Manzoni",
    email: "baryari2005@gmail.com",
    role: "user",
    status: "PENDIENTE",
    approvalStatus: "PENDIENTE",
    initials: "SE",
    avatarUrl: null,
    registeredAt: "15/05/2024 09:30",
    dni: "27.123.456",
    phone: "11 2345 6789",
    address: "Av. Balbin 1200, San Miguel",
    birthDate: "12/03/1985",
    lastAccess: "No ha iniciado sesion",
    failedAttempts: 0,
    permissionsSummary:
      "Puede crear actividades, inscribirse y consultar informacion publica.",
  },
  {
    id: "usr_2",
    userId: "admin",
    fullName: "Administrador Sistema",
    email: "admin@local",
    role: "admin",
    status: "ACTIVO",
    approvalStatus: "ACTIVO",
    initials: "AD",
    avatarUrl: null,
    registeredAt: "02/04/2024 14:20",
    dni: "30.001.222",
    phone: "11 5555 1111",
    address: "Palacio Municipal, San Miguel",
    birthDate: "01/01/1980",
    lastAccess: "Hoy 10:42",
    failedAttempts: 0,
    permissionsSummary:
      "Administra usuarios, roles, actividades y configuracion del sistema.",
  },
  {
    id: "usr_3",
    userId: "mruiz",
    fullName: "Mariela Ruiz",
    email: "mruiz@msm.gob.ar",
    role: "editor",
    status: "BLOQUEADO",
    approvalStatus: "ACTIVO",
    initials: "MR",
    avatarUrl: null,
    registeredAt: "21/04/2024 11:10",
    dni: "32.445.900",
    phone: "11 6789 1200",
    address: "Sarmiento 850, San Miguel",
    birthDate: "22/09/1990",
    lastAccess: "10/05/2024 16:14",
    failedAttempts: 3,
    permissionsSummary:
      "Gestioná actividades y establecimientos asignados por administracion.",
  },
];

export function useUsersManagementMock() {
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(MOCK_USERS[0]?.id ?? "");

  const users = useMemo(() => filterManagedUsers(MOCK_USERS, query), [query]);

  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;

  const selectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  return {
    query,
    setQuery,
    users,
    selectedUser,
    selectedUserId: selectedUser?.id ?? selectedUserId,
    selectUser,
    total: MOCK_USERS.length,
  };
}
