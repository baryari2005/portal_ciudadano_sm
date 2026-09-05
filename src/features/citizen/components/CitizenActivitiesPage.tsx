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
  Globe2,
  LibraryBig,
  MapPin,
  SlidersHorizontal,
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
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"name" | "availability">("name");

  const items = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesQuery = !value || `${item.name} ${item.shortDescription ?? ""} ${item.category ?? ""} ${item.audiences.join(" ")}`.toLowerCase().includes(value);
      const matchesCost = cost === "all" || (cost === "free" ? item.free : !item.free);
      const matchesDocumentation = documentation === "all" || (documentation === "required" ? item.requiresDocumentation : !item.requiresDocumentation);
      const matchesCategory = category === "all" || item.category === category;
      return matchesQuery && matchesCost && matchesDocumentation && matchesCategory;
    }).sort((left, right) => sort === "availability" ? right.schedules.reduce((total, schedule) => total + schedule.availableCount, 0) - left.schedules.reduce((total, schedule) => total + schedule.availableCount, 0) : left.name.localeCompare(right.name, "es"));
  }, [category, cost, documentation, items, query, sort]);
  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter((value): value is string => Boolean(value)))], [items]);

  const pageItems = filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => { setPage(1); }, [query, cost, documentation, category, sort]);

  if (loading) return <CatalogLoadingState label="actividades" fullPage />;

  return (
    <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] lg:p-8">
      <div className="hidden lg:block"><CatalogPageHeader
        title="Actividades disponibles"
        description="Encontrá propuestas municipales, consultá sus requisitos y elegí un horario para participar."
        total={items.length}
      /></div>

      <CitizenState loading={false} error={error} onRetry={retry}>
        <MobileActivitiesView items={pageItems} total={filtered.length} categories={categories} query={query} category={category} sort={sort} cost={cost} documentation={documentation} page={page} onQueryChange={setQuery} onCategoryChange={setCategory} onSortChange={setSort} onCostChange={setCost} onDocumentationChange={setDocumentation} onPageChange={setPage} />
        <div className="hidden lg:block">
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
                        "grid w-full self-start grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-secondary)]",
                        selectedId === item.id ? "border-[var(--brand-primary)] bg-[var(--brand-panel)] shadow-sm" : "border-[var(--brand-border-soft)] bg-white hover:border-[var(--brand-secondary)] hover:shadow-sm",
                      )}
                      data-admin-list-card=""
                    >
                      <ActivityImagePreview source={item.imageUrl} alt={`Imagen de ${item.name}`} className="size-12 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2"><span className="truncate font-extrabold text-[var(--brand-ink)]">{item.name}</span><Badge className="rounded-full border border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-secondary)]/15">{item.free ? "Gratuita" : "Arancelada"}</Badge><EnrollmentModeBadge mode={item.enrollmentMode} /></span>
                        <span className="mt-1 line-clamp-1 block text-sm text-[var(--brand-text)]/75">{item.shortDescription || "Conocé esta actividad municipal."}</span>
                        <span className="mt-2 block text-xs font-semibold text-[var(--brand-text)]/65">{item.schedules.length} {item.schedules.length === 1 ? "horario disponible" : "horarios disponibles"}</span>
                      </span>
                      <ChevronRight className="size-5 text-[var(--brand-secondary)]" />
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
        </div>
      </CitizenState>
    </main>
  );
}

function MobileActivitiesView({items,total,categories,query,category,sort,cost,documentation,page,onQueryChange,onCategoryChange,onSortChange,onCostChange,onDocumentationChange,onPageChange}:{items:CitizenActivity[];total:number;categories:string[];query:string;category:string;sort:"name"|"availability";cost:CostFilter;documentation:DocumentationFilter;page:number;onQueryChange:(value:string)=>void;onCategoryChange:(value:string)=>void;onSortChange:(value:"name"|"availability")=>void;onCostChange:(value:CostFilter)=>void;onDocumentationChange:(value:DocumentationFilter)=>void;onPageChange:(page:number)=>void}){
  return <div className="pb-5 lg:hidden">
    <header className="px-4 pb-4 pt-5"><h1 className="text-2xl font-extrabold text-[var(--brand-primary)]">Actividades</h1><p className="mt-1 text-xs text-[var(--brand-muted)]">Descubrí y participá de las actividades pensadas para vos.</p></header>
    <div className="px-4"><div className="relative"><CatalogSearchInput value={query} onChange={onQueryChange} placeholder="Buscar actividades..."/><div className="absolute right-1.5 top-1/2 z-10 -translate-y-1/2"><CatalogFilterPopover trigger={<Button type="button" variant="ghost" size="icon" aria-label="Abrir filtros" className="size-10 rounded-lg text-[var(--brand-primary)] hover:bg-[var(--brand-panel)]"><SlidersHorizontal className="size-5"/></Button>} sections={[{id:"mobile-activity-cost",title:"Costo",value:cost,options:[{value:"all",label:"Todas"},{value:"free",label:"Gratuitas"},{value:"paid",label:"Aranceladas"}],onChange:(value)=>onCostChange(value as CostFilter)},{id:"mobile-activity-documents",title:"Documentación",value:documentation,options:[{value:"all",label:"Todas"},{value:"required",label:"Requieren documentación"},{value:"not-required",label:"No requieren documentación"}],onChange:(value)=>onDocumentationChange(value as DocumentationFilter)}]}/></div></div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2"><CategoryChip label="Todas" active={category==="all"} onClick={()=>onCategoryChange("all")}/>{categories.map((item)=><CategoryChip key={item} label={item} active={category===item} onClick={()=>onCategoryChange(item)}/>)}</div>
      <div className="mt-3 flex items-center justify-between gap-3"><h2 className="text-sm font-extrabold text-[var(--brand-primary)]">Todas las actividades</h2><label className="flex items-center gap-1 text-[10px] font-bold text-[var(--brand-muted)]">Ordenar por<select value={sort} onChange={(event)=>onSortChange(event.target.value as "name"|"availability")} className="bg-transparent text-[var(--brand-primary)] outline-none"><option value="name">Nombre</option><option value="availability">Cupos</option></select></label></div>
      {items.length?<div className="mt-3 grid grid-cols-2 gap-3">{items.map((item)=><MobileActivityCard key={item.id} item={item}/>)}</div>:<div className="mt-4 rounded-3xl border border-dashed border-[var(--brand-border)] bg-[#F9FAF5] p-8 text-center"><LibraryBig className="mx-auto size-8 text-[var(--brand-secondary)]"/><p className="mt-3 text-sm font-extrabold text-[var(--brand-primary)]">No encontramos actividades</p></div>}
      {total>CATALOG_PAGE_SIZE?<div className="mt-4"><CatalogPagination page={page} total={total} onPageChange={onPageChange}/></div>:null}
    </div>
  </div>
}

function CategoryChip({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}){return <button type="button" onClick={onClick} className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[10px] font-bold",active?"bg-[var(--brand-primary)] text-white":"border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] text-[var(--brand-text)]")}><Globe2 className="size-3.5"/>{label}</button>}

function MobileActivityCard({item}:{item:CitizenActivity}){const schedule=item.schedules[0];const available=item.schedules.reduce((total,current)=>total+current.availableCount,0);const enrolled=item.schedules.some((current)=>Boolean(current.ownEnrollmentStatus));return <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] shadow-[0_6px_18px_rgba(29,79,54,0.10)]"><ActivityImagePreview source={item.imageUrl} alt={`Imagen de ${item.name}`} className="aspect-[1.45/1] h-auto w-full !rounded-none !border-0"/><div className="flex flex-1 flex-col p-3"><p className="text-[9px] font-bold text-[var(--brand-secondary)]">{item.category||"Actividad"}</p><h3 className="mt-1 line-clamp-2 text-sm font-extrabold leading-4 text-[var(--brand-primary)]">{item.name}</h3><p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-[var(--brand-muted)]">{item.shortDescription||"Conocé esta actividad municipal."}</p>{schedule?<div className="mt-3 space-y-1 text-[9px] text-[var(--brand-text)]"><p className="flex items-center gap-1"><CalendarClock className="size-3"/>{schedule.day} · {schedule.startTime} a {schedule.endTime}</p><p className="flex items-center gap-1 truncate"><MapPin className="size-3"/>{schedule.establishment.name}</p></div>:null}<span className="mt-2 text-[9px] font-bold text-[var(--brand-secondary)]">{available>0?`${available} cupos disponibles`:"Sin cupos disponibles"}</span><Button asChild variant="outline" className="mt-3 h-8 w-full rounded-lg border-[var(--brand-secondary)] bg-transparent px-2 text-xs font-bold text-[var(--brand-primary)]"><Link href={`/citizen/activities/${item.id}`}>{enrolled?"Ver detalles":"Inscribirme"}<ChevronRight className="size-3"/></Link></Button></div></article>}

function ActivityDetail({ item, onBack }: { item: CitizenActivity | null; onBack: () => void }) {
  if (!item) return <aside className="hidden h-full min-h-72 items-center justify-center rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-8 text-center text-sm font-semibold text-[var(--brand-text)]/70 lg:flex">Seleccioná una actividad para consultar su detalle.</aside>;
  const establishments = [...new Set(item.schedules.map((schedule) => schedule.establishment?.name).filter(Boolean))];
  const available = item.schedules.reduce((total, schedule) => total + schedule.availableCount, 0);

  return (
    <aside className="h-fit overflow-y-auto rounded-3xl border border-[var(--brand-border-soft)] bg-[var(--brand-panel)] p-5 text-[var(--brand-ink)] shadow-sm sm:p-7 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-var(--topbar-h)-96px)]">
      <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2 text-[var(--brand-primary)] lg:hidden"><ArrowLeft />Volver al listado</Button>
      <div className="flex items-start gap-4">
        <ActivityImagePreview source={item.imageUrl} alt={`Imagen de ${item.name}`} className="size-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1"><h2 className="break-words text-2xl font-extrabold text-[var(--brand-primary)]">{item.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge className="rounded-full bg-white text-[var(--brand-text)] hover:bg-white">{item.category || "Sin categoría"}</Badge><Badge className="rounded-full bg-[var(--brand-accent)] text-[var(--brand-primary)] hover:bg-[var(--brand-accent)]">{item.free ? "Gratuita" : `$${item.price}`}</Badge></div></div>
      </div>
      <p className="mt-5 text-sm leading-6 text-[var(--brand-text)]">{item.shortDescription || "Conocé esta actividad municipal y sus horarios disponibles."}</p>
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={CalendarClock} label="Horarios disponibles">{item.schedules.length}</CatalogDetailField>
        <CatalogDetailField icon={CalendarClock} label="Modalidad">{item.enrollmentMode === "PERMANENTE" ? "Inscripción permanente" : item.enrollmentMode === "POR_PERIODO" ? `Inscripción por ${item.periodMonths ?? 1} ${item.periodMonths === 1 ? "mes" : "meses"}` : "Reserva por cada clase o turno"}</CatalogDetailField>
        <CatalogDetailField icon={MapPin} label="Establecimientos">{establishments.length ? establishments.join(", ") : "Sin establecimiento asignado"}</CatalogDetailField>
        <CatalogDetailField icon={Users} label="Público">{item.audiences.length ? item.audiences.join(", ") : "Público general"}</CatalogDetailField>
        <CatalogDetailField icon={CircleDollarSign} label="Costo">{item.free ? "Actividad gratuita" : `$${item.price}`}</CatalogDetailField>
        <CatalogDetailField icon={ClipboardCheck} label="Cupos disponibles">{available}</CatalogDetailField>
        <CatalogDetailField icon={FileCheck2} label="Requisitos">{item.requiresDocumentation ? "Requiere documentación" : item.hasRequirements ? `${item.requirements.length} requisitos de inscripción` : "Sin requisitos adicionales"}</CatalogDetailField>
      </dl>
      <div className="mt-6 border-t border-[var(--brand-border)] pt-5">
        <Button asChild className="h-11 w-full rounded-xl bg-[var(--brand-primary)] font-bold hover:bg-[var(--brand-primary-hover)]"><Link href={`/citizen/activities/${item.id}`}><CalendarClock />Ver horarios e inscribirme</Link></Button>
      </div>
    </aside>
  );
}

function EnrollmentModeBadge({ mode }: { mode: CitizenActivity["enrollmentMode"] }) {
  return <Badge variant="outline" className="rounded-full border-[var(--brand-border)] bg-white text-[var(--brand-text)]">{mode === "PERMANENTE" ? "Permanente" : mode === "POR_PERIODO" ? "Por período" : "Por clase"}</Badge>;
}
