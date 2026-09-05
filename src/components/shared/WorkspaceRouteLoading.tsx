import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";

export function WorkspaceRouteLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-full place-items-center bg-[var(--brand-page)]">
      <CatalogLoadingState label={label} fullPage />
    </div>
  );
}
