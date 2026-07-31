import { CatalogSearchInput } from "@/features/activity-catalogs/components/CatalogPrimitives";

type UsersSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function UsersSearchBar({ value, onChange }: UsersSearchBarProps) {
  return <CatalogSearchInput value={value} onChange={onChange} placeholder="Buscar por nombre, usuario o email..." />;
}
