type Props = {
  activo: boolean;
};

export function RoleStatusBadge({ activo }: Props) {
  return (
    <CatalogStatusBadge
      active={activo}
      activeLabel="Activo"
      inactiveLabel="Inactivo"
    />
  );
}
import { CatalogStatusBadge } from "@/features/activity-catalogs/components/CatalogPrimitives";
