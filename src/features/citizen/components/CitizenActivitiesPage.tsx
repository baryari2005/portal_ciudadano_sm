"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  LibraryBig,
  MapPin,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CatalogDetailField,
  CatalogEmptyState,
  CatalogFilterPopover,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearchInput,
  CATALOG_PAGE_SIZE,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { CitizenState, useCitizenData } from "./CitizenPrimitives";
import { ActivityImagePreview } from "@/features/actividades/components/ActivityImagePreview";

type ActivitySchedule = {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  availableCount: number;
  ownEnrollmentStatus: string | null;
  establishment: { id: string; name: string };
};

type CitizenActivity = {
  id: string;
  name: string;
  shortDescription: string | null;
  imageUrl: string | null;
  category: string | null;
  level: string | null;
  enrollmentMode: "PERMANENTE" | "POR_PERIODO" | "POR_CLASE";
  periodMonths: number | null;
  cancellationNoticeHours: number;
  free: boolean;
  price: string | null;
  audiences: string[];
  hasRequirements: boolean;
  requiresDocumentation: boolean;
  requirements: Array<{ id: string; name: string; mandatory: boolean; requiresDocument: boolean }>;
  schedules: ActivitySchedule[];
};

type CostFilter = "all" | "free" | "paid";
type DocumentationFilter = "all" | "required" | "not-required";

export function CitizenActivitiesPage() {
  const { data, loading, error, retry } = useCitizenData<CitizenActivity[]>("/activities");
  const [query, setQuery] = useState("");
  const [cost, setCost] = useState<CostFilter>("all");
  const [documentation, setDocumentation] = useState<DocumentationFilter>("all");
  const [selectedId, setSelectedId] = useState("");
  const [page, setPage] = useState(1);

  const items = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !value || `${item.name} ${item.shortDescription ?? ""} ${item.category ?? ""} ${item.audiences.join(" ")}`.toLowerCase().includes(value);
      const matchesCost = cost === "all" || (cost === "free" ? item.free : !item.free);
      const matchesDocumentation = documentation === "all" || (documentation === "required" ? item.requiresDocumentation : !item.requiresDocumentation);
      return matchesQuery && matchesCost && matchesDocumentation;
    });
  }, [cost, documentation, items, query]);

  const pageItems = filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => { setPage(1); }, [query, cost, documentation]);

  if (loading) return <CatalogLoadingState label="actividades" fullPage />;

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[#F7FBF5] p-4 sm:p-6 lg:p-8">
      <CatalogPageHeader
        title="Actividades disponibles"
        description="Encontrá propuestas municipales, consultá sus requisitos y elegí un horario para participar."
        total={items.length}
      />

      <CitizenState loading={false} error={error} onRetry={retry}>
        <section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,0.95fr)_minmax(420px,1.05fr)]">
          <div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por actividad, categoría o público..." />
              <CatalogFilterPopover sections={[
                { id: "activity-cost", title: "Costo", value: cost, options: [{ value: "all", label: "Todas" }, { value: "free", label: "Gratuitas" }, { value: "paid", label: "Aranceladas" }], onChange: (value) => setCost(value as CostFilter) },
                { id: "activity-documents", title: "Documentación", value: documentation, options: [{ value: "all", label: "Todas" }, { value: "required", label: "Requieren documentación" }, { value: "not-required", label: "No requieren documentación" }], onChange: (value) => setDocumentation(value as DocumentationFilter) },
              ]} />
            </div>

            {!filtered.length ? (
              <CatalogEmptyState title="No hay actividades disponibles." description="Todavía no se publicaron propuestas para inscribirse." filtered={Boolean(query.trim()) || cost !== "all" || documentation !== "all"} />
            ) : (
              <div className="flex min-h-0 flex-col gap-3">
                <div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-310px)]">
                  {pageItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#819B56]",
                        selectedId === item.id ? "border-[#1D4F36] bg-[#EEF6E9] shadow-sm" : "border-[#DDE8D7] bg-white hover:border-[#819B56] hover:shadow-sm",
                      )}
                      data-admin-list-card=""
                    >
                      <ActivityImagePreview source={item.imageUrl} alt={`Imagen de ${item.name}`} className="size-12 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2"><span className="truncate font-extrabold text-[#173C2A]">{item.name}</span><Badge className="rounded-full border border-[#819B56]/40 bg-[#819B56]/15 text-[#1D4F36] hover:bg-[#819B56]/15">{item.free ? "Gratuita" : "Arancelada"}</Badge><EnrollmentModeBadge mode={item.enrollmentMode} /></span>
                        <span className="mt-1 line-clamp-1 block text-sm text-[#315644]/75">{item.shortDescription || "Conocé esta actividad municipal."}</span>
                        <span className="mt-2 block text-xs font-semibold text-[#315644]/65">{item.schedules.length} {item.schedules.length === 1 ? "horario disponible" : "horarios disponibles"}</span>
                      </span>
                      <ChevronRight className="size-5 text-[#819B56]" />
                    </button>
                  ))}
                </div>
                <CatalogPagination page={page} total={filtered.length} onPageChange={setPage} />
              </div>
            )}
          </div>

          <div className={cn(!selectedId && "hidden lg:block")}>
            <ActivityDetail item={selected} onBack={() => setSelectedId("")} />
          </div>
        </section>
      </CitizenState>
    </main>
  );
}

function ActivityDetail({ item, onBack }: { item: CitizenActivity | null; onBack: () => void }) {
  if (!item) return <aside className="hidden h-full min-h-72 items-center justify-center rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-8 text-center text-sm font-semibold text-[#315644]/70 lg:flex">Seleccioná una actividad para consultar su detalle.</aside>;
  const establishments = [...new Set(item.schedules.map((schedule) => schedule.establishment?.name).filter(Boolean))];
  const available = item.schedules.reduce((total, schedule) => total + schedule.availableCount, 0);

  return (
    <aside className="h-fit overflow-y-auto rounded-3xl border border-[#DDE8D7] bg-[#EEF6E9] p-5 text-[#173C2A] shadow-sm sm:p-7 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-var(--topbar-h)-96px)]">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[#1D4F36] lg:hidden"><ArrowLeft />Volver al listado</Button>
      <div className="flex items-start gap-4">
        <ActivityImagePreview source={item.imageUrl} alt={`Imagen de ${item.name}`} className="size-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-extrabold text-[#1D4F36]">{item.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge className="rounded-full bg-white text-[#315644] hover:bg-white">{item.category || "Sin categoría"}</Badge><Badge className="rounded-full bg-[#DDEF8F] text-[#1D4F36] hover:bg-[#DDEF8F]">{item.free ? "Gratuita" : `$${item.price}`}</Badge></div></div>
      </div>
      <p className="mt-5 text-sm leading-6 text-[#315644]">{item.shortDescription || "Conocé esta actividad municipal y sus horarios disponibles."}</p>
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={CalendarClock} label="Horarios disponibles">{item.schedules.length}</CatalogDetailField>
        <CatalogDetailField icon={CalendarClock} label="Modalidad">{item.enrollmentMode === "PERMANENTE" ? "Inscripción permanente" : item.enrollmentMode === "POR_PERIODO" ? `Inscripción por ${item.periodMonths ?? 1} ${item.periodMonths === 1 ? "mes" : "meses"}` : "Reserva por cada clase o turno"}</CatalogDetailField>
        <CatalogDetailField icon={MapPin} label="Establecimientos">{establishments.length ? establishments.join(", ") : "Sin establecimiento asignado"}</CatalogDetailField>
        <CatalogDetailField icon={Users} label="Público">{item.audiences.length ? item.audiences.join(", ") : "Público general"}</CatalogDetailField>
        <CatalogDetailField icon={CircleDollarSign} label="Costo">{item.free ? "Actividad gratuita" : `$${item.price}`}</CatalogDetailField>
        <CatalogDetailField icon={ClipboardCheck} label="Cupos disponibles">{available}</CatalogDetailField>
        <CatalogDetailField icon={FileCheck2} label="Requisitos">{item.requiresDocumentation ? "Requiere documentación" : item.hasRequirements ? `${item.requirements.length} requisitos de inscripción` : "Sin requisitos adicionales"}</CatalogDetailField>
      </dl>
      <div className="mt-6 border-t border-[#C9D9C3] pt-5">
        <Button asChild className="h-11 w-full rounded-xl bg-[#1D4F36] font-bold hover:bg-[#143A27]"><Link href={`/citizen/activities/${item.id}`}><CalendarClock />Ver horarios e inscribirme</Link></Button>
      </div>
    </aside>
  );
}

function EnrollmentModeBadge({ mode }: { mode: CitizenActivity["enrollmentMode"] }) {
  return <Badge variant="outline" className="rounded-full border-[#C9D9C3] bg-white text-[#315644]">{mode === "PERMANENTE" ? "Permanente" : mode === "POR_PERIODO" ? "Por período" : "Por clase"}</Badge>;
}
