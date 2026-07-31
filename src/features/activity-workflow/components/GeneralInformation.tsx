"use client";
import { BadgeDollarSign, FileText, GraduationCap, ImageIcon, NotebookText, Tags } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RequestAccessPhotoField } from "@/features/auth/request-access/components/RequestAccessPhotoField";
import type { ActivityDraftPayload } from "../types/activity-draft.types";

const controlClass = "h-12 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-11 font-medium text-[#173C2A] placeholder:text-[#6D8D75]";
export function GeneralInformation({ payload, patch, categories }: { payload: ActivityDraftPayload; patch: (value: Partial<ActivityDraftPayload>) => void; categories: Array<{ id: string; nombre: string }> }) {
  return <div className="space-y-6"><RequestAccessPhotoField currentUrl={payload.imagenUrl} title="Foto de la actividad" description="Referencia visual que se mostrará en el portal ciudadano." uploadEndpoint="/api/activities/images" allowCamera onUploaded={({ publicUrl }) => patch({ imagenUrl: publicUrl })} onClear={() => patch({ imagenUrl: null })} sidePreview /><div className="grid gap-5 sm:grid-cols-2">
    <Control label="Nombre *" icon={<FileText />}><Input className={controlClass} value={payload.nombre} onChange={(event) => patch({ nombre: event.target.value })} /></Control>
    <Control label="Categoría *" icon={<Tags />} wide><Select value={payload.categoriaActividadId ?? undefined} onValueChange={(categoriaActividadId) => patch({ categoriaActividadId })}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.nombre}</SelectItem>)}</SelectContent></Select></Control>
    <Control label="Descripción corta" icon={<NotebookText />} wide><Input className={controlClass} value={payload.descripcionCorta ?? ""} onChange={(event) => patch({ descripcionCorta: event.target.value })} /></Control>
    <Control label="Descripción" icon={<NotebookText />} wide><Textarea className="min-h-28 w-full rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-11 pt-3 text-[#173C2A]" value={payload.descripcion ?? ""} onChange={(event) => patch({ descripcion: event.target.value })} /></Control>
    <Control label="Nivel" icon={<GraduationCap />} wide><Select value={payload.nivel ?? undefined} onValueChange={(nivel) => patch({ nivel: nivel as ActivityDraftPayload["nivel"] })}><SelectTrigger className={controlClass}><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger><SelectContent><SelectItem value="INICIAL">Inicial</SelectItem><SelectItem value="INTERMEDIO">Intermedio</SelectItem><SelectItem value="AVANZADO">Avanzado</SelectItem></SelectContent></Select></Control>
    <Control label="Precio" icon={<BadgeDollarSign />}><Input className={controlClass} type="number" min={0} disabled={payload.esGratuita} value={payload.precio ?? ""} onChange={(event) => patch({ precio: event.target.value || null })} /></Control>
    <label className="flex h-12 cursor-pointer items-center gap-3 self-end rounded-xl border border-[#DDE8D7] bg-[#F7FBF5] px-4"><Checkbox checked={payload.esGratuita} onCheckedChange={(value) => patch({ esGratuita: value === true, precio: value === true ? null : payload.precio })} /><span className="font-bold text-[#173C2A]">Actividad gratuita</span></label>
  </div></div>;
}
function Control({ label, icon, wide, children }: { label: string; icon: React.ReactNode; wide?: boolean; children: React.ReactNode }) { return <div className={`space-y-2 ${wide ? "sm:col-span-2" : ""}`}><Label className="font-bold text-[#173C2A]">{label}</Label><div className="relative"><span className="pointer-events-none absolute left-3.5 top-3.5 z-10 text-[#1D4F36] [&_svg]:size-5">{icon}</span>{children}</div></div>; }
