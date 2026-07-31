import { Badge } from "@/components/ui/badge";
import { CatalogStatusBadge } from "@/features/activity-catalogs/components/CatalogPrimitives";

import {
  getRoleClass,
  USER_STATUS_CLASSES,
  USER_STATUS_LABELS,
} from "../../helpers/user-management.helpers";
import type {
  ManagedUser,
  ManagedUserStatus,
} from "../../types/management.types";

type StatusPillProps = {
  status: ManagedUserStatus;
};

type RolePillProps = {
  role: ManagedUser["role"];
};

export function StatusPill({ status }: StatusPillProps) {
  if (status === "ACTIVO") {
    return <CatalogStatusBadge active activeLabel="Activo" />;
  }

  return (
    <Badge variant="outline" className={USER_STATUS_CLASSES[status]}>
      {USER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function RolePill({ role }: RolePillProps) {
  return (
    <Badge variant="outline" className={getRoleClass(role)}>
      {role}
    </Badge>
  );
}
