"use client";

import { type FormEvent, useEffect, useState } from "react";
import { AlignLeft, ArrowLeft, BadgeCheck, BookOpen, Filter, Loader2, Save, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { IconInput } from "@/components/forms/IconInput";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RequestAccessPhotoField } from "@/features/auth/request-access/components/RequestAccessPhotoField";

import { createProfesorSchema, updateProfesorSchema } from "../schemas/profesor.schema";
import { buscarUsuariosDisponiblesClient } from "../services/profesores.service";
import type { CreateProfesorInput, Profesor, UpdateProfesorInput, UsuarioDisponible } from "../types/profesor.types";

type RoleFilter = "all" | "teacher" | "admin";

export function ProfesorForm({ item, loading, onCancel, onCreate, onUpdate }: {
  item: Profesor | null;
  loading: boolean;
  onCancel: () => void;
  onCreate: (data: CreateProfesorInput) => Promise<void>;
  onUpdate: (data: UpdateProfesorInput) => Promise<void>;
}) {
  const [usuario, setUsuario] = useState<UsuarioDisponible | null>(null);
  const [users, setUsers] = useState<UsuarioDisponible[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searching, setSearching] = useState(false);
  const [especialidad, setEspecialidad] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [matricula, setMatricula] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setUsuario(item?.usuario ?? null);
    setEspecialidad(item?.especialidad ?? "");
    setDescripcion(item?.descripcion ?? "");
    setMatricula(item?.matricula ?? "");
    setFotoUrl(item?.fotoUrl ?? "");
    setQuery("");
    setUsers([]);
  }, [item]);

  useEffect(() => {
    if (item) return;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setUsers(await buscarUsuariosDisponiblesClient(query, roleFilter === "all" ? undefined : roleFilter));
      } catch {
        toast.error("No pudimos buscar usuarios disponibles.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, roleFilter, item]);

  const selectedUser = item?.usuario ?? usuario;
  const fullName = (user: UsuarioDisponible) => [user.nombre, user.apellido].filter(Boolean).join(" ") || "Sin nombre";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = { especialidad, descripcion, matricula, fotoUrl };
    const parsed = item
      ? updateProfesorSchema.safeParse(raw)
      : createProfesorSchema.safeParse({ ...raw, usuarioId: usuario?.id, estado: "ACTIVO" });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisá los datos.");
      return;
    }
    if (item) await onUpdate(parsed.data as UpdateProfesorInput);
    else await onCreate(parsed.data as CreateProfesorInput);
  }

  return (
    <form onSubmit={submit} className="w-full text-[#173C2A]" noValidate>
      <div className="w-full rounded-3xl border border-[#819B56]/20 bg-white/80 p-5 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 border-b border-[#C9D9C3] pb-5">
          <h2 className="text-lg font-extrabold text-[#003A22]">Datos del perfil profesional</h2>
          <p className="mt-1 text-sm font-medium text-[#5F6F68]">Asociá un usuario de Personal y completá la información profesional.</p>
        </div>

        <div className="space-y-7">
          <section className="space-y-3">
            <h3 className="font-extrabold text-[#173C2A]">Usuario asociado</h3>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(300px,1.1fr)]">
              <div className="space-y-3 rounded-2xl border border-[#D7E3D1] bg-[#F8FBF6] p-4">
                <IconInput id="professor-user-search" leftIcon={<Search className="size-4 text-[#1D4F36]" />} input={<Input id="professor-user-search" value={query} onChange={(event) => setQuery(event.target.value)} disabled={Boolean(item)} placeholder="Buscar por nombre, apellido, DNI o email" className="h-11 rounded-xl border-[#C9D9C3] bg-white pl-9 font-medium text-[#173C2A]" />} />
                <IconInput id="professor-role-filter" leftIcon={<Filter className="size-4 text-[#1D4F36]" />} input={<Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)} disabled={Boolean(item)}><SelectTrigger className="h-11 w-full rounded-xl border-[#C9D9C3] bg-white pl-9 font-medium text-[#173C2A]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los roles habilitados</SelectItem><SelectItem value="teacher">Profesor</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select>} />
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {item ? <p className="rounded-xl border border-dashed border-[#819B56]/45 bg-white p-5 text-center text-sm font-medium text-[#5F6F68]">El usuario asociado no puede cambiarse durante la edición.</p> : searching ? <div className="flex items-center gap-2 rounded-xl border border-[#C9D9C3] bg-white p-4 text-sm font-medium text-[#5F6F68]"><Loader2 className="size-4 animate-spin" />Buscando candidatos...</div> : users.length ? users.map((user) => <button type="button" key={user.id} onClick={() => setUsuario(user)} className={`w-full rounded-xl border p-3 text-left transition ${usuario?.id === user.id ? "border-[#1D4F36] bg-[#DDEED2]" : "border-[#C9D9C3] bg-white hover:border-[#819B56] hover:bg-[#F7FBF5]"}`}><span className="flex items-center justify-between gap-2"><span className="font-semibold">{fullName(user)}</span><span className="rounded-full border border-[#819B56]/35 bg-[#EEF6E9] px-2 py-0.5 text-[11px] font-bold text-[#1D4F36]">{user.rol.nombre}</span></span><span className="mt-1 block text-xs text-[#5F6F68]">DNI {user.dni || "—"} · {user.email}</span></button>) : <p className="rounded-xl border border-dashed border-[#819B56]/45 bg-white p-5 text-center text-sm font-medium text-[#5F6F68]">No se encontraron candidatos disponibles.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-[#D7E3D1] bg-white p-5">
                {selectedUser ? <div className="space-y-3"><div><p className="text-xs font-bold uppercase text-[#819B56]">Candidato seleccionado</p><p className="mt-1 text-lg font-extrabold text-[#173C2A]">{fullName(selectedUser)}</p></div><div className="border-t border-[#D7E3D1] pt-3 text-sm text-[#5F6F68]"><p>DNI {selectedUser.dni || "—"}</p><p>{selectedUser.email}</p><p className="mt-2 font-bold text-[#1D4F36]">Rol: {selectedUser.rol.nombre}</p></div>{!item ? <Button type="button" variant="outline" className="rounded-xl border-[#819B56] font-bold text-[#1D4F36]" onClick={() => setUsuario(null)}>Quitar selección</Button> : null}</div> : <div className="grid min-h-48 place-items-center text-center"><div><UserPlus className="mx-auto size-9 text-[#819B56]" /><p className="mt-3 font-extrabold text-[#173C2A]">Seleccioná un candidato</p><p className="mt-1 text-sm text-[#5F6F68]">Elegí una persona con rol Profesor o Administrador.</p></div></div>}
              </div>
            </div>
          </section>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Especialidad" htmlFor="especialidad"><IconInput id="especialidad" leftIcon={<BookOpen className="size-4 text-[#1D4F36]" />} input={<Input id="especialidad" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} maxLength={160} className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]" placeholder="Ej: Educación física" />} /></FormField>
            <FormField label="Matrícula" htmlFor="matricula"><IconInput id="matricula" leftIcon={<BadgeCheck className="size-4 text-[#1D4F36]" />} input={<Input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} maxLength={120} className="h-11 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]" placeholder="Número de matrícula" />} /></FormField>
          </div>
          <FormField label="Descripción" htmlFor="descripcion"><div className="relative"><AlignLeft className="pointer-events-none absolute left-3 top-3 size-4 text-[#1D4F36]" /><Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={1200} rows={4} className="min-h-28 rounded-xl border-[#C9D9C3] bg-[#F7FBF5] pl-9 font-medium text-[#173C2A]" placeholder="Formación, experiencia u observaciones profesionales" /></div></FormField>
          <RequestAccessPhotoField title="Foto del profesor" description="Subí o tomá una foto clara para identificar al profesor." currentUrl={fotoUrl || null} disabled={loading} uploadEndpoint="/api/profesores/images" onUploaded={({ publicUrl }) => setFotoUrl(publicUrl)} onClear={() => setFotoUrl("")} onUploadingChange={setUploading} sidePreview />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploading} className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}><ArrowLeft className="h-5 w-5" />Volver</Button>
        <Button type="submit" disabled={loading || uploading || (!item && !usuario)} className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}>{loading || uploading ? <Loader2 className="animate-spin" /> : item ? <Save /> : <UserPlus />}{item ? "Guardar cambios" : "Crear profesor"}</Button>
      </div>
    </form>
  );
}

function FormField({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label htmlFor={htmlFor} className="font-extrabold text-[#173C2A]">{label}</Label>{children}</div>;
}
