"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeDollarSign,
  ArchiveX,
  CalendarRange,
  ChevronRight,
  CircleAlert,
  Clock3,
  Dumbbell,
  Edit3,
  FileText,
  GraduationCap,
  RefreshCcw,
  ShieldCheck,
  Tags,
  Trash2,
  UsersRound,
} from "lucide-react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AdminDetailActions, AdminDetailHeader, AdminDetailPanel, AdminListCard } from "@/components/shared/admin-patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CATALOG_PAGE_SIZE,
  CatalogDetailField,
  CatalogEmptyState,
  CatalogErrorState,
  CatalogFilterPopover,
  CatalogLoadingState,
  CatalogPageHeader,
  CatalogPagination,
  CatalogSearchInput,
} from "@/features/activity-catalogs/components/CatalogPrimitives";
import { useCan } from "@/hooks/useCan";
import { cn } from "@/lib/utils";

import {
  formatActividadAgeRange,
  formatActividadEstado,
  formatActividadLevel,
  formatActividadPrice,
  resolveActividadColor,
} from "../helpers/actividad-display";
import { useActividades } from "../hooks/useActividades";
import { useActivityCatalogs } from "../hooks/useActivityCatalogs";
import { archiveActivityClient, getActivityDeletionPreviewClient, patchActividadClient, purgeActivityClient, type ActivityDeletionPreview } from "../services/actividades.service";
import type {
  Actividad,
  ActividadEstado,
} from "../types/actividad.types";
import { ActivityImagePreview } from "./ActivityImagePreview";
import { ActivityDraftsPanel } from "@/features/activity-workflow/components/ActivityDraftsPanel";
import type { ActivityDraft } from "@/features/activity-workflow/types/activity-draft.types";
import { discardDraftClient, listDraftsClient } from "@/features/activity-workflow/services/activity-drafts.service";

type EconomicFilter = "all" | "free" | "paid";

const STATE_OPTIONS: Array<{ value: ActividadEstado; label: string }> = [
  { value: "BORRADOR", label: "Borrador" },
  { value: "ACTIVA", label: "Activa" },
  { value: "BLOQUEADA", label: "Bloqueada" },
  { value: "SUSPENDIDA", label: "Suspendida" },
  { value: "FINALIZADA", label: "Finalizada" },
  { value: "CANCELADA", label: "Cancelada" },
];

export function ActividadesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activityList = useActividades();
  const catalogs = useActivityCatalogs();
  const canCreate = useCan("actividades", "crear");
  const canEdit = useCan("actividades", "editar");
  const canChangeState = useCan("actividades", "eliminar");
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [publicFilter, setPublicFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [economicFilter, setEconomicFilter] = useState<EconomicFilter>("all");
  const [page, setPage] = useState(1);
  const [pendingState, setPendingState] = useState<ActividadEstado | null>(null);
  const [changingState, setChangingState] = useState(false);
  const [stateImpact, setStateImpact] = useState<ActivityDeletionPreview | null>(null);
  const [lifecycleMode, setLifecycleMode] = useState<"archive" | "purge" | null>(null);
  const [lifecyclePreview, setLifecyclePreview] = useState<ActivityDeletionPreview | null>(null);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [purgeConfirmation, setPurgeConfirmation] = useState("");
  const [selectedDraft, setSelectedDraft] = useState<ActivityDraft | null>(null);
  const [drafts, setDrafts] = useState<ActivityDraft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  const [draftToDiscard,setDraftToDiscard]=useState<ActivityDraft|null>(null),[discardingDraft,setDiscardingDraft]=useState(false);

  useEffect(() => { void listDraftsClient().then(setDrafts).catch(() => setDrafts([])).finally(() => setDraftsLoading(false)); }, []);
  async function discardDraft(){if(!draftToDiscard)return;setDiscardingDraft(true);try{await discardDraftClient(draftToDiscard.id);setDrafts(current=>current.filter(item=>item.id!==draftToDiscard.id));if(selectedDraft?.id===draftToDiscard.id)setSelectedDraft(null);toast.success("Borrador descartado.");}catch{toast.error("No pudimos descartar el borrador.");}finally{setDiscardingDraft(false);setDraftToDiscard(null);}}

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected) activityList.setSelectedId(selected);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return activityList.items.filter((item) => {
      const searchable = [
        item.nombre,
        item.descripcionCorta,
        item.descripcion,
        item.categoriaActividad?.nombre,
        ...item.publicosObjetivo.map((publicItem) => publicItem.nombre),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("es");
      return (
        (!normalized || searchable.includes(normalized)) &&
        (stateFilter === "all" || item.estado === stateFilter) &&
        (categoryFilter === "all" || item.categoriaActividadId === categoryFilter) &&
        (publicFilter === "all" || item.publicosObjetivo.some((entry) => entry.id === publicFilter)) &&
        (levelFilter === "all" || item.nivel === levelFilter) &&
        (economicFilter === "all" || item.esGratuita === (economicFilter === "free"))
      );
    });
  }, [activityList.items, categoryFilter, economicFilter, levelFilter, publicFilter, query, stateFilter]);

  useEffect(() => setPage(1), [query, stateFilter, categoryFilter, publicFilter, levelFilter, economicFilter]);

  const visibleItems = filteredItems.slice(
    (page - 1) * CATALOG_PAGE_SIZE,
    page * CATALOG_PAGE_SIZE,
  );

  async function changeState() {
    if (!activityList.selected || !pendingState) return;
    setChangingState(true);
    try {
      await patchActividadClient(activityList.selected.id, { estado: pendingState });
      await activityList.refresh();
    } finally {
      setChangingState(false);
      setPendingState(null);
      setStateImpact(null);
    }
  }

  async function openStateChange(state: ActividadEstado) {
    if (!activityList.selected) return;
    setPendingState(state);
    setStateImpact(null);
    try { setStateImpact(await getActivityDeletionPreviewClient(activityList.selected.id)); }
    catch { toast.error("No pudimos calcular el impacto completo del cambio."); }
  }

  async function openLifecycle(mode: "archive" | "purge") {
    if (!activityList.selected) return;
    setLifecycleMode(mode);
    setLifecyclePreview(null);
    setLifecycleReason("");
    setPurgeConfirmation("");
    setLifecycleLoading(true);
    try { setLifecyclePreview(await getActivityDeletionPreviewClient(activityList.selected.id)); }
    catch { toast.error("No pudimos analizar las relaciones de la actividad."); setLifecycleMode(null); }
    finally { setLifecycleLoading(false); }
  }

  async function confirmLifecycle() {
    if (!activityList.selected || !lifecyclePreview || !lifecycleMode) return;
    setLifecycleLoading(true);
    try {
      if (lifecycleMode === "archive") {
        await archiveActivityClient(activityList.selected.id, lifecycleReason);
        toast.success("La actividad fue dada de baja y se notificó a las personas afectadas.");
      } else {
        await purgeActivityClient(activityList.selected.id, purgeConfirmation);
        toast.success("La actividad y sus datos asociados fueron eliminados.");
      }
      setLifecycleMode(null);
      activityList.setSelectedId("");
      await activityList.refresh();
    } catch { toast.error(lifecycleMode === "archive" ? "No pudimos dar de baja la actividad." : "No pudimos eliminar definitivamente la actividad."); }
    finally { setLifecycleLoading(false); }
  }

  if (activityList.loading || draftsLoading || catalogs.loading) return <CatalogLoadingState label="actividades" fullPage />;

  return (
    <div className="grid min-h-[calc(100dvh-var(--topbar-h)-48px)] w-full grid-rows-[auto_minmax(0,1fr)] gap-5 bg-[var(--brand-page)] p-4 sm:p-6 lg:h-[calc(100dvh-var(--topbar-h)-48px)] lg:overflow-hidden lg:p-8">
      <CatalogPageHeader
        icon={Dumbbell}
        title="Actividades"
        description="Administrá la información general de las propuestas municipales."
        total={filteredItems.length}
        createLabel="Nueva actividad"
        canCreate={canCreate}
        onCreate={() => router.push("/activities/new")}
      />
      <section className="grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,.95fr)_minmax(420px,1.05fr)]">
        <div className={cn("min-h-0 flex-col gap-4", (activityList.selectedId || selectedDraft) ? "hidden lg:flex" : "flex")}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <CatalogSearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre o descripción..." />
            <CatalogFilterPopover sections={[
              { id: "activity-state", title: "Estado", value: stateFilter, options: [{ value: "all", label: "Todos" }, ...STATE_OPTIONS], onChange: setStateFilter },
              { id: "activity-category", title: "Categoría", value: categoryFilter, options: [{ value: "all", label: "Todas" }, ...catalogs.categories.map((item) => ({ value: item.id, label: item.nombre }))], onChange: setCategoryFilter },
              { id: "activity-public", title: "Dirigido a", value: publicFilter, options: [{ value: "all", label: "Todos" }, ...catalogs.publics.map((item) => ({ value: item.id, label: item.nombre }))], onChange: setPublicFilter },
              { id: "activity-level", title: "Nivel", value: levelFilter, options: [{ value: "all", label: "Todos" }, { value: "INICIAL", label: "Inicial" }, { value: "INTERMEDIO", label: "Intermedio" }, { value: "AVANZADO", label: "Avanzado" }], onChange: setLevelFilter },
              { id: "activity-economic", title: "Modalidad económica", value: economicFilter, options: [{ value: "all", label: "Todas" }, { value: "free", label: "Gratuita" }, { value: "paid", label: "Paga" }], onChange: (value) => setEconomicFilter(value as EconomicFilter) },
            ]} />
          </div>
          {activityList.error || catalogs.error ? <CatalogErrorState message={activityList.error || catalogs.error || "No pudimos cargar las actividades."} onRetry={() => { void activityList.refresh(); void catalogs.refresh(); }} /> : null}
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          <div className="grid gap-3">
            <ActivityDraftsPanel items={drafts} selectedId={selectedDraft?.id} onSelect={(item) => { setSelectedDraft(item); activityList.setSelectedId(""); }} />
            {visibleItems.map((item) => <ActivityListItem key={item.id} item={item} selected={item.id === activityList.selectedId} onSelect={() => { setSelectedDraft(null); activityList.setSelectedId(item.id); }} />)}
            {!visibleItems.length && !drafts.length ? <CatalogEmptyState title="No hay actividades cargadas." description="Creá la primera actividad para comenzar." filtered={Boolean(query || stateFilter !== "all" || categoryFilter !== "all" || publicFilter !== "all" || levelFilter !== "all" || economicFilter !== "all")} /> : null}
          </div>
          </div>
          <CatalogPagination page={page} total={filteredItems.length} onPageChange={setPage} />
        </div>

        <div className={cn("min-h-0", !(activityList.selectedId || selectedDraft) && "hidden lg:block")}>
        {selectedDraft ? <DraftDetail item={selectedDraft} onBack={() => setSelectedDraft(null)} onContinue={() => router.push(`/activities/workflow/${selectedDraft.id}`)} onDiscard={()=>setDraftToDiscard(selectedDraft)} /> : <ActivityDetail
          item={activityList.selected}
          canEdit={canEdit}
          canChangeState={canChangeState}
          onBack={() => activityList.setSelectedId("")}
          onEdit={(id) => router.push(`/activities/${id}/edit`)}
          onStateChange={(state) => void openStateChange(state)}
          onArchive={() => void openLifecycle("archive")}
          onPurge={() => void openLifecycle("purge")}
        />}
        </div>
      </section>

      <ConfirmDialog
        open={draftToDiscard !== null}
        title="¿Descartar borrador?"
        description={draftToDiscard?.activityId
          ? "Se eliminarán los cambios pendientes. La actividad publicada permanecerá sin modificaciones."
          : "La actividad en preparación se eliminará y no podrá recuperarse."}
        confirmLabel="Descartar borrador"
        loading={discardingDraft}
        icon={<Trash2 />}
        onClose={() => setDraftToDiscard(null)}
        onConfirm={() => void discardDraft()}
      />

      <ConfirmDialog
        open={pendingState !== null}
        title={`${pendingState ? formatActividadEstado(pendingState) : "Cambiar estado"} actividad`}
        description={`La actividad conservará toda su información y quedará en estado ${pendingState ? formatActividadEstado(pendingState).toLowerCase() : "seleccionado"}.`}
        confirmLabel="Confirmar"
        loading={changingState}
        onClose={() => { setPendingState(null); setStateImpact(null); }}
        onConfirm={() => void changeState()}
      >
        {stateImpact ? <div className="grid grid-cols-2 gap-2 text-sm"><LifecycleCount label="Clases futuras" value={stateImpact.futureSessions} /><LifecycleCount label="Personas a notificar" value={stateImpact.affectedUsers} /></div> : <p className="text-sm text-[var(--brand-muted)]">Calculando el impacto sobre clases futuras e inscripciones...</p>}
      </ConfirmDialog>

      <ConfirmDialog
        open={lifecycleMode !== null}
        title={lifecycleMode === "archive" ? "Dar de baja la actividad" : "Eliminar definitivamente"}
        description={lifecycleMode === "archive" ? "Se cancelarán las clases futuras, reservas e inscripciones activas, conservando el historial." : "Esta acción elimina la actividad y todos sus datos operativos asociados. No se puede deshacer."}
        confirmLabel={lifecycleMode === "archive" ? "Dar de baja" : "Eliminar definitivamente"}
        loading={lifecycleLoading}
        icon={lifecycleMode === "archive" ? <ArchiveX /> : <Trash2 />}
        confirmDisabled={!lifecyclePreview || (lifecycleMode === "archive" ? lifecycleReason.trim().length < 3 : !lifecyclePreview.canPurge || purgeConfirmation !== lifecyclePreview.name)}
        onClose={() => { if (!lifecycleLoading) setLifecycleMode(null); }}
        onConfirm={() => void confirmLifecycle()}
      >
        {lifecyclePreview ? <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <LifecycleCount label="Horarios" value={lifecyclePreview.schedules} />
            <LifecycleCount label="Clases" value={lifecyclePreview.sessions} />
            <LifecycleCount label="Inscripciones" value={lifecyclePreview.enrollments} />
            <LifecycleCount label="Reservas" value={lifecyclePreview.reservations} />
            <LifecycleCount label="Asistencias" value={lifecyclePreview.attendanceRecords} />
            <LifecycleCount label="Documentos" value={lifecyclePreview.enrollmentDocuments} />
          </div>
          {lifecycleMode === "archive" ? <Textarea value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} rows={4} className="rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)]" placeholder="Motivo de la baja *" /> : <div className="grid gap-2"><p className="text-sm text-[var(--brand-muted)]">Escribí <strong>{lifecyclePreview.name}</strong> para confirmar.</p><Input value={purgeConfirmation} onChange={(event) => setPurgeConfirmation(event.target.value)} className="h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-control)]" />{!lifecyclePreview.canPurge ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{lifecyclePreview.purgeBlockedReason}</p> : null}</div>}
        </div> : <p className="text-sm font-medium text-[var(--brand-muted)]">Cargando relaciones de la actividad...</p>}
      </ConfirmDialog>
    </div>
  );
}

function ActivityListItem({ item, selected, onSelect }: { item: Actividad; selected: boolean; onSelect: () => void }) {
  const color = resolveActividadColor(item.color, item.categoriaActividad?.color);
  return <AdminListCard onClick={onSelect} selected={selected} leading={<div className="overflow-hidden rounded-xl border-2" style={{ borderColor: color }}><ActivityImagePreview source={item.imagenUrl} alt={`Imagen de ${item.nombre}`} className="size-12" /></div>} title={item.nombre} badges={<ActivityStateBadge state={item.estado} />} description={item.descripcionCorta || "Sin descripción corta"} meta={`${item.categoriaActividad?.nombre ?? legacyCategoryLabel(item.categoria)} · ${formatActividadLevel(item.nivel)} · ${formatActividadPrice(item)}`} trailing={<ChevronRight />} />;
}

function ActivityDetail({ item, canEdit, canChangeState, onBack, onEdit, onStateChange, onArchive, onPurge }: { item: Actividad | null; canEdit: boolean; canChangeState: boolean; onBack: () => void; onEdit: (id: string) => void; onStateChange: (state: ActividadEstado) => void; onArchive: () => void; onPurge: () => void }) {
  if (!item) return <AdminDetailPanel empty="Seleccioná una actividad para consultar su detalle." />;
  const color = resolveActividadColor(item.color, item.categoriaActividad?.color);
  return (
    <AdminDetailPanel className="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden" onBack={onBack}>
      <AdminDetailHeader title={item.nombre} leading={<div className="rounded-2xl border-2" style={{ borderColor: color }}><ActivityImagePreview source={item.imagenUrl} alt={`Imagen de ${item.nombre}`} className="h-20 w-24" /></div>} badge={<ActivityStateBadge state={item.estado} />} />
      <div className="brand-scrollbar min-h-0 flex-1 overflow-y-auto pr-2">
      <dl className="mt-6 grid gap-3">
        <CatalogDetailField icon={FileText} label="Descripción corta">{item.descripcionCorta || "Sin descripción corta"}</CatalogDetailField>
        <CatalogDetailField icon={Clock3} label="Días y horarios">{formatActivitySchedules(item.horarios)}</CatalogDetailField>
        <CatalogDetailField icon={Tags} label="Categoría">{item.categoriaActividad?.nombre ?? legacyCategoryLabel(item.categoria)}</CatalogDetailField>
        <CatalogDetailField icon={UsersRound} label="Dirigido a">{item.publicosObjetivo.length ? item.publicosObjetivo.map((entry) => entry.nombre).join(", ") : "Sin público definido"}</CatalogDetailField>
        <CatalogDetailField icon={GraduationCap} label="Nivel">{formatActividadLevel(item.nivel)}</CatalogDetailField>
        <CatalogDetailField icon={CalendarRange} label="Rango de edad">{formatActividadAgeRange(item.edadMinima, item.edadMaxima)}</CatalogDetailField>
        <CatalogDetailField icon={ShieldCheck} label="Requisitos">{item.requirements.length ? item.requirements.map((entry) => `${entry.name} (${entry.mandatory ? "obligatorio" : "opcional"}${entry.active ? "" : ", inactivo"})`).join(", ") : "Esta actividad no tiene requisitos configurados."}</CatalogDetailField>
        <CatalogDetailField icon={BadgeDollarSign} label="Modalidad económica">{formatActividadPrice(item)}</CatalogDetailField>
      </dl>
      </div>
      {canEdit || canChangeState ? <AdminDetailActions className="lg:shrink-0">{canEdit ? <Button type="button" onClick={() => onEdit(item.id)} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"><Edit3 /> Editar</Button> : null}{canChangeState ? <Select onValueChange={(value) => onStateChange(value as ActividadEstado)}><SelectTrigger className="h-12 w-full rounded-xl border-[var(--brand-border)] bg-white text-base font-bold text-[var(--brand-primary)]"><RefreshCcw className="size-5 text-[var(--brand-primary)]" /><SelectValue placeholder="Cambiar estado" /></SelectTrigger><SelectContent>{STATE_OPTIONS.filter((option) => option.value !== item.estado && option.value !== "CANCELADA" && option.value !== "BORRADOR").map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select> : null}{canChangeState && item.estado !== "CANCELADA" ? <Button type="button" variant="outline" onClick={onArchive} className="text-[var(--brand-primary)]"><ArchiveX />Dar de baja</Button> : null}{canChangeState ? <Button type="button" variant="outline" onClick={onPurge} className="text-red-700 hover:bg-red-50"><Trash2 />Eliminar definitivamente</Button> : null}</AdminDetailActions> : null}
    </AdminDetailPanel>
  );
}

function LifecycleCount({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-[var(--brand-control)] p-3"><p className="text-xs font-bold uppercase text-[var(--brand-muted)]">{label}</p><p className="mt-1 text-lg font-extrabold text-[var(--brand-primary)]">{value}</p></div>;
}

function DraftDetail({ item, onBack, onContinue, onDiscard }: { item: ActivityDraft; onBack: () => void; onContinue: () => void; onDiscard: () => void }) {
  return <AdminDetailPanel className="lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden" onBack={onBack}><AdminDetailHeader title={item.name} subtitle="Actividad en preparación" leading={<span className="grid size-16 place-items-center rounded-2xl bg-[var(--brand-border-soft)] text-[var(--brand-primary)]"><FileText className="size-8" /></span>} badge={<Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900">{item.completion}% completo</Badge>} /><div className="brand-scrollbar min-h-0 flex-1 overflow-y-auto pr-2"><dl className="mt-6 grid gap-3"><CatalogDetailField icon={FileText} label="Descripción">{item.payload.descripcionCorta || item.payload.descripcion || "Todavía no se cargó una descripción."}</CatalogDetailField><CatalogDetailField icon={CalendarRange} label="Modalidad">{item.modality || "Pendiente"}</CatalogDetailField><CatalogDetailField icon={ShieldCheck} label="Progreso">{item.completion}% completo · paso {item.currentStep} de 10</CatalogDetailField><CatalogDetailField icon={CircleAlert} label="Pendientes">{item.pending.length ? item.pending.map((entry) => entry.label).join(", ") : "Sin datos pendientes"}</CatalogDetailField></dl></div><AdminDetailActions className="lg:shrink-0"><Button onClick={onContinue} className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]"><Edit3 />Continuar configuración</Button><Button type="button" variant="outline" onClick={onDiscard} className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"><Trash2 />Descartar borrador</Button></AdminDetailActions></AdminDetailPanel>;
}

function ActivityStateBadge({ state }: { state: ActividadEstado }) {
  return <Badge variant="outline" className="rounded-full border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 px-2.5 py-1 font-bold text-[var(--brand-primary)]">{formatActividadEstado(state)}</Badge>;
}

const activityDayOrder = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"];
const activityDayLabels: Record<string, string> = { LUNES: "Lun", MARTES: "Mar", MIERCOLES: "Mié", JUEVES: "Jue", VIERNES: "Vie", SABADO: "Sáb", DOMINGO: "Dom" };
function formatActivitySchedules(items: Actividad["horarios"]) {
  if (!items.length) return "Sin días ni horarios configurados";
  const groups = new Map<string, string[]>();
  items.slice().sort((a, b) => activityDayOrder.indexOf(a.diaSemana) - activityDayOrder.indexOf(b.diaSemana)).forEach((item) => {
    const time = `${item.horaInicio} a ${item.horaFin}`;
    groups.set(time, [...(groups.get(time) ?? []), activityDayLabels[item.diaSemana] ?? item.diaSemana]);
  });
  return [...groups.entries()].map(([time, days]) => `${days.join(", ")} · ${time}`).join(" | ");
}

function legacyCategoryLabel(value: string) {
  return ({ EDUCACION: "Educación", DEPORTE: "Deportes", SALUD: "Salud", CULTURA: "Cultura", OFICIO: "Oficios", AMBIENTE: "Ambiente", COMUNIDAD: "Comunidad" } as Record<string, string>)[value] ?? "Sin categoría";
}
