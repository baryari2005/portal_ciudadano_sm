"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowLeft, Boxes, Building2, Hash, Layers3, Loader2, NotebookText, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { resourceSchema } from "../schemas/resource.schema";
import { createResourceClient, resourceOptionsClient, updateResourceClient } from "../services/resources.service";
import type { Resource, ResourceInput } from "../types/resource.types";

const empty: ResourceInput = { establecimientoId: "", nombre: "", codigo: "", descripcion: null, tipo: "EQUIPAMIENTO", modoReserva: "CAPACIDAD", capacidadUnidades: 1, estado: "ACTIVO" };
const inputClass = "h-11 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] font-medium text-[var(--brand-ink)] placeholder:text-[#6D8D75]";
const selectClass = "h-11 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 text-sm font-medium text-[var(--brand-ink)] shadow-sm";

export function ResourceForm({ mode, defaultValues, onLoadingChange }: { mode: "create" | "edit"; defaultValues?: Resource | null; onLoadingChange?: (loading: boolean) => void }) {
  const router = useRouter(), isEdit = mode === "edit";
  const [form, setForm] = useState<ResourceInput>(defaultValues ? pick(defaultValues) : empty);
  const [establishments, setEstablishments] = useState<Array<{ id: string; nombre: string; direccion: string; activo: boolean; estado: string }>>([]);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { void resourceOptionsClient().then((data) => { setEstablishments(data.establishments); if (!data.establishments.length) toast.warning("No hay establecimientos cargados."); }).catch((error) => toast.error(error instanceof Error ? error.message : "No pudimos cargar los establecimientos.")).finally(() => setLoading(false)); }, []);
  useEffect(() => { onLoadingChange?.(loading); }, [loading, onLoadingChange]);
  const set = <K extends keyof ResourceInput>(key: K, value: ResourceInput[K]) => { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: "" })); };
  async function submit(event: React.FormEvent) { event.preventDefault(); const parsed = resourceSchema.safeParse(form); if (!parsed.success) { setErrors(Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [key, value?.[0] ?? ""]))); toast.error("Revisá los campos indicados."); return; } setSaving(true); try { const saved = isEdit && defaultValues ? await updateResourceClient(defaultValues.id, parsed.data) : await createResourceClient(parsed.data); toast.success(isEdit ? "Recurso actualizado." : "Recurso creado."); router.replace(`/resources?selected=${saved.id}`); } catch (error) { toast.error(error instanceof Error ? error.message : "No pudimos guardar el recurso."); } finally { setSaving(false); } }
  if (loading) return onLoadingChange ? null : <div className="flex min-h-72 items-center justify-center rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80"><Loader2 className="mr-3 animate-spin text-[var(--brand-primary)]" /><span className="font-semibold text-[var(--brand-primary)]">Cargando formulario...</span></div>;

  return <form id="resource-form" className="w-full" onSubmit={submit}>
    <div className="rounded-3xl border border-[var(--brand-secondary)]/20 bg-white/80 p-5 text-[var(--brand-ink)] shadow-sm sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--brand-border)] pb-5"><div><h2 className="text-lg font-extrabold text-[var(--brand-heading)]">Datos del recurso físico</h2><p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">Información requerida para identificar el recurso y controlar su disponibilidad.</p></div></div>
      <div className="space-y-6"><div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label="Nombre *" icon={Boxes} error={errors.nombre}><Input className={inputClass} value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej: Cancha F5 1" /></Field>
        <Field label="Estado *" icon={Activity}><Select value={form.estado} onValueChange={(value) => set("estado", value as ResourceInput["estado"])}><SelectTrigger className={`${selectClass} w-full`}><SelectValue /></SelectTrigger><SelectContent className="border-[var(--brand-border)] bg-[var(--brand-page)]"><SelectItem value="ACTIVO">Activo</SelectItem><SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem><SelectItem value="INACTIVO">Inactivo</SelectItem></SelectContent></Select></Field>
        <Field label="Código *" icon={Hash} error={errors.codigo}><Input className={inputClass} value={form.codigo} onChange={(e) => set("codigo", e.target.value.toUpperCase())} placeholder="Ej: CANCHA-F5-01" /></Field>
        <Field label="Establecimiento *" icon={Building2} error={errors.establecimientoId}><Select value={form.establecimientoId} onValueChange={(value) => set("establecimientoId", value)}><SelectTrigger className={`${selectClass} w-full`}><SelectValue placeholder="Seleccionar establecimiento" /></SelectTrigger><SelectContent className="border-[var(--brand-border)] bg-[var(--brand-page)]">{establishments.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre} · {item.direccion}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Tipo de recurso *" icon={Boxes}><Select value={form.tipo} onValueChange={(value) => set("tipo", value as ResourceInput["tipo"])}><SelectTrigger className={`${selectClass} w-full`}><SelectValue /></SelectTrigger><SelectContent className="border-[var(--brand-border)] bg-[var(--brand-page)]"><SelectItem value="ESPACIO">Espacio</SelectItem><SelectItem value="CANCHA">Cancha</SelectItem><SelectItem value="EQUIPAMIENTO">Equipamiento</SelectItem><SelectItem value="COMPUTADORA">Computadora</SelectItem><SelectItem value="ANDARIVEL">Andarivel</SelectItem><SelectItem value="OTRO">Otro</SelectItem></SelectContent></Select></Field>
        <Field label="Forma de reserva *" icon={Layers3}><Select value={form.modoReserva} onValueChange={(value) => set("modoReserva", value as ResourceInput["modoReserva"])}><SelectTrigger className={`${selectClass} w-full`}><SelectValue /></SelectTrigger><SelectContent className="border-[var(--brand-border)] bg-[var(--brand-page)]"><SelectItem value="CAPACIDAD">Capacidad compartida</SelectItem><SelectItem value="ESPECIFICO">Recurso específico</SelectItem><SelectItem value="EXCLUSIVO">Uso exclusivo</SelectItem></SelectContent></Select></Field>
        <Field label="Unidades disponibles *" icon={Layers3} error={errors.capacidadUnidades}><Input className={inputClass} type="number" min={1} value={form.capacidadUnidades} onChange={(e) => set("capacidadUnidades", Number(e.target.value))} /><p className="mt-1 text-xs text-[var(--brand-muted)]">En recursos exclusivos o individuales normalmente es 1.</p></Field>
        <Field label="Descripción" icon={NotebookText}><Textarea className="min-h-11 resize-y rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] pl-9 font-medium text-[var(--brand-ink)]" value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} placeholder="Ubicación, características o indicaciones de uso." /></Field>
      </div>
      {mode === "create" ? <section className="space-y-4 border-t border-[#D7E0D8] pt-6"><div><p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-primary)]">Cómo cargar el recurso</p><p className="mt-1 text-sm text-[var(--brand-muted)]">Elegí el criterio que represente cómo se utiliza físicamente.</p></div><div className="grid gap-3 md:grid-cols-3"><Guide title="Capacidad compartida">Un conjunto como “Computadoras del ciber”, indicando 12 unidades.</Guide><Guide title="Recurso específico">Cada elemento identificado, como “Computadora 01”.</Guide><Guide title="Uso exclusivo">Una cancha o salón que queda bloqueado durante la reserva.</Guide></div></section> : null}
      </div>
    </div>
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button asChild type="button" variant="outline" className="h-12 w-full justify-center gap-3 rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] px-8 text-base font-bold text-[var(--brand-ink)] shadow-sm hover:bg-[var(--brand-panel)] sm:w-auto"><Link href="/resources"><ArrowLeft className="size-5" />Volver</Link></Button><Button type="submit" size="lg" disabled={saving} className="h-12 w-full justify-center gap-3 rounded-xl bg-[#014D31] px-8 text-base font-bold text-white shadow-sm hover:bg-[var(--brand-heading)] sm:w-auto">{saving ? <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Guardando...</span> : <span className="inline-flex items-center gap-2"><Save className="size-4" />{isEdit ? "Guardar cambios" : "Crear recurso"}</span>}</Button></div>
  </form>;
}

function pick(item: Resource): ResourceInput { return { establecimientoId: item.establecimientoId, nombre: item.nombre, codigo: item.codigo, descripcion: item.descripcion, tipo: item.tipo, modoReserva: item.modoReserva, capacidadUnidades: item.capacidadUnidades, estado: item.estado }; }
function Field({ label, icon: Icon, error, children }: { label: string; icon: typeof Boxes; error?: string; children: React.ReactNode }) { return <div className="space-y-1"><Label className="font-extrabold text-[var(--brand-ink)]">{label}</Label><div className="relative"><Icon className="pointer-events-none absolute left-3 top-[14px] z-10 size-4 text-[var(--brand-primary)]" /><div className="[&_input]:pl-9">{children}</div></div>{error ? <p className="text-xs text-red-700">{error}</p> : null}</div>; }
function Guide({ title, children }: { title: string; children: React.ReactNode }) { return <div className="rounded-[18px] border border-[#D7E0D8] bg-[var(--brand-page)] p-4"><p className="font-extrabold text-[var(--brand-primary)]">{title}</p><p className="mt-1 text-sm text-[var(--brand-muted)]">{children}</p></div>; }
