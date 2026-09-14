"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, CalendarClock, ChevronRight, ClipboardCheck, Eye, FileCheck2, FileWarning, IdCard, Mail, MapPin, Phone, UserRound, UsersRound } from "lucide-react";
import { UserAvatar } from "@/components/layout/user-menu/UserAvatar";
import { AdminDetailHeader, AdminDetailPanel, AdminListCard, AdminPageShell } from "@/components/shared/admin-patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATALOG_PAGE_SIZE, CatalogDetailField, CatalogEmptyState, CatalogLoadingState, CatalogPageHeader, CatalogPagination, CatalogSearchInput, formatCatalogDate } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { cn } from "@/lib/utils";
import { getTeacherEnrolleesClient, type TeacherEnrollee } from "../services/teacher.service";

const enrollmentLabels: Record<string, string> = { PENDIENTE: "Pendiente", CONFIRMADA: "Confirmada", LISTA_ESPERA: "Lista de espera" };
const fullName = (item: TeacherEnrollee) => [item.citizen.firstName, item.citizen.lastName].filter(Boolean).join(" ") || "Ciudadano sin nombre";
const hasMissingDocumentation = (item: TeacherEnrollee) => (item.documentation?.missingCount ?? 0) > 0 || ["OBSERVADA", "EN_REVISION", "PENDIENTE"].includes(item.documentation?.status ?? "");

export function TeacherEnrolleesPage() {
  const [search, setSearch] = useState(""), [page, setPage] = useState(1), [selectedId, setSelectedId] = useState("");
  const [items, setItems] = useState<TeacherEnrollee[]>([]), [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState(false);
  useEffect(() => { setPage(1); setSelectedId(""); }, [search]);
  useEffect(() => { let active = true; setLoading(true); setError(false); void getTeacherEnrolleesClient({ search: search || undefined, page, pageSize: CATALOG_PAGE_SIZE }).then((result) => { if (active) { setItems(result.data); setTotal(result.meta.total); } }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [page, search]);
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const shared = { items, search, setSearch, page, setPage, setSelectedId, total, loading, error };
  return <><div className="md:hidden"><MobileView {...shared} selected={selectedId ? selected : null}/></div><div className="hidden md:block"><DesktopView {...shared} selected={selected} selectedId={selectedId}/></div></>;
}

type SharedProps = { items: TeacherEnrollee[]; search: string; setSearch: (value: string) => void; page: number; setPage: (value: number) => void; setSelectedId: (value: string) => void; total: number; loading: boolean; error: boolean };

function DesktopView({ items, selected, selectedId, search, setSearch, page, setPage, setSelectedId, total, loading, error }: SharedProps & { selected: TeacherEnrollee | null; selectedId: string }) {
  return <AdminPageShell><CatalogPageHeader icon={UsersRound} title="Inscriptos" description="Consultá los inscriptos en tus actividades y su documentación." total={total}/><section className="mt-6 grid min-h-0 gap-6 lg:grid-cols-[minmax(340px,.95fr)_minmax(420px,1.05fr)]"><div className={cn("min-h-0 flex-col gap-4", selectedId ? "hidden lg:flex" : "flex")}><CatalogSearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, apellido, DNI o email..."/><Results items={items} selected={selected} search={search} page={page} setPage={setPage} setSelectedId={setSelectedId} total={total} loading={loading} error={error}/></div><div className={cn(!selectedId && "hidden lg:block")}><Detail item={selected} onBack={() => setSelectedId("")}/></div></section></AdminPageShell>;
}

function MobileView({ items, selected, search, setSearch, page, setPage, setSelectedId, total, loading, error }: SharedProps & { selected: TeacherEnrollee | null }) {
  if (selected) return <main className="min-h-full bg-[var(--brand-page)] px-4 py-5"><Detail item={selected} onBack={() => setSelectedId("")}/></main>;
  return <main className="min-h-full bg-[var(--brand-page)] px-4 py-5"><header className="border-b border-[var(--brand-border-soft)] pb-4"><div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-[var(--brand-primary)]">Inscriptos</h1><p className="mt-1 text-sm leading-5 text-[var(--brand-muted)]">Personas inscriptas en las actividades que dictás.</p></div><span className="grid min-w-9 place-items-center rounded-full bg-[var(--brand-primary)] px-2 py-1 text-xs font-bold text-white">{total}</span></div></header><div className="mt-4"><CatalogSearchInput value={search} onChange={setSearch} placeholder="Buscar persona..."/></div><div className="mt-4"><Results items={items} selected={null} search={search} page={page} setPage={setPage} setSelectedId={setSelectedId} total={total} loading={loading} error={error}/></div></main>;
}

function Results({ items, selected, search, page, setPage, setSelectedId, total, loading, error }: { items: TeacherEnrollee[]; selected: TeacherEnrollee | null; search: string; page: number; setPage: (value: number) => void; setSelectedId: (value: string) => void; total: number; loading: boolean; error: boolean }) {
  if (loading) return <CatalogLoadingState label="inscriptos"/>;
  if (error) return <CatalogEmptyState title="No pudimos cargar los inscriptos." description="Reintentá nuevamente en unos instantes." filtered={false}/>;
  if (!items.length) return <CatalogEmptyState title="No se encontraron personas inscriptas." description="Los ciudadanos aparecerán cuando se inscriban en una actividad que dictás." filtered={Boolean(search)}/>;
  return <div className="flex min-h-0 flex-col gap-3"><div className="grid gap-3 overflow-y-auto pr-1 lg:max-h-[calc(100dvh-var(--topbar-h)-300px)]">{items.map((item) => <EnrolleeCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={() => setSelectedId(item.id)}/>)}</div><CatalogPagination page={page} total={total} onPageChange={setPage}/></div>;
}

function EnrolleeCard({ item, selected, onSelect }: { item: TeacherEnrollee; selected: boolean; onSelect: () => void }) {
  const name = fullName(item);
  return <AdminListCard onClick={onSelect} selected={selected} leading={<UserAvatar src={item.citizen.avatarUrl ?? undefined} name={name} className="size-12 shrink-0 rounded-xl border border-[var(--brand-border-soft)]" imageClassName="object-cover" fallbackBgClass="rounded-xl bg-[var(--brand-primary)]" textClass="font-extrabold text-white"/>} title={name} badges={<EnrollmentStatus value={item.status}/>} description={<span className="flex items-center gap-1"><IdCard className="size-3.5"/>DNI {item.citizen.documentNumber || "Sin registrar"}</span>} meta={<span className="flex items-center gap-1"><ClipboardCheck className="size-3.5 text-[var(--brand-primary)]"/>{item.activity.nombre} · {item.establishment.nombre}</span>} trailing={<ChevronRight className="size-5"/>}/>;
}

function Detail({ item, onBack }: { item: TeacherEnrollee | null; onBack: () => void }) {
  if (!item) return <AdminDetailPanel empty="Seleccioná una persona para consultar su detalle."/>;
  const name = fullName(item), missing = hasMissingDocumentation(item);
  return <AdminDetailPanel onBack={onBack} backLabel="Volver a inscriptos"><AdminDetailHeader title={name} subtitle={`Inscripción en ${item.activity.nombre}`} leading={<UserAvatar src={item.citizen.avatarUrl ?? undefined} name={name} className="size-16 shrink-0 rounded-2xl border border-[var(--brand-border-soft)]" imageClassName="object-cover" fallbackBgClass="rounded-2xl bg-[var(--brand-primary)]" textClass="text-xl font-extrabold text-white"/>} badge={<EnrollmentStatus value={item.status}/>} action={<Button asChild variant="outline" className="w-full border-[var(--brand-secondary)] bg-white font-bold text-[var(--brand-primary)]"><Link href={`/teacher/enrollees/${item.citizen.id}/record/personal-data?enrollmentId=${item.id}`}><Eye/>Ver ficha completa</Link></Button>}/><dl className="mt-6 grid gap-3"><CatalogDetailField icon={UserRound} label="Usuario">{item.citizen.userId}</CatalogDetailField><CatalogDetailField icon={Mail} label="Email">{item.citizen.email}</CatalogDetailField><CatalogDetailField icon={IdCard} label="DNI">{item.citizen.documentNumber || "Sin registrar"}</CatalogDetailField><CatalogDetailField icon={Phone} label="Teléfono">{item.citizen.phone || "Sin registrar"}</CatalogDetailField><CatalogDetailField icon={MapPin} label="Dirección">{item.citizen.address || "Sin registrar"}</CatalogDetailField><CatalogDetailField icon={ClipboardCheck} label="Actividad">{item.activity.nombre}</CatalogDetailField><CatalogDetailField icon={Building2} label="Establecimiento">{item.establishment.nombre}</CatalogDetailField><CatalogDetailField icon={CalendarClock} label="Fecha de inscripción">{formatCatalogDate(item.enrollmentDate)}</CatalogDetailField><CatalogDetailField icon={missing ? FileWarning : FileCheck2} label="Documentación"><Documentation item={item}/></CatalogDetailField></dl></AdminDetailPanel>;
}

function EnrollmentStatus({ value }: { value: string }) { return <Badge variant="outline" className="h-6 rounded-full border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 px-2 py-0 text-[9px] font-bold text-[var(--brand-primary)] md:h-auto md:px-2.5 md:py-1 md:text-xs">{enrollmentLabels[value] ?? value}</Badge>; }
function Documentation({ item }: { item: TeacherEnrollee }) { const missing = hasMissingDocumentation(item), none = item.documentation?.status === "NO_REQUERIDA" || !item.documentation; return <div><Badge variant="outline" className={cn("rounded-full", missing ? "border-amber-300 bg-amber-50 text-amber-800" : "border-[var(--brand-secondary)]/40 bg-[var(--brand-highlight)] text-[var(--brand-primary)]")}>{missing ? <FileWarning className="mr-1 size-3.5"/> : <FileCheck2 className="mr-1 size-3.5"/>}{none ? "Sin documentación requerida" : missing ? "Documentación pendiente" : "Documentación completa"}</Badge>{item.documentation?.requiredCount ? <p className="mt-2 text-xs text-[var(--brand-muted)]">{item.documentation.approvedCount} aprobados de {item.documentation.requiredCount} documentos obligatorios</p> : null}{item.documentation?.missingRequirementNames?.length ? <p className="mt-1 text-xs font-bold text-amber-800">Falta: {item.documentation.missingRequirementNames.join(", ")}</p> : null}</div>; }
