"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, HeartPulse, IdCard, KeyRound, Mail, MapPin, Pencil, Phone, ShieldPlus, UserRound } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CitizenMobileProfileData = {
  nombre: string | null;
  apellido: string | null;
  documento: string | null;
  email: string;
  celular: string | null;
  domicilio: string | null;
  localidad: string | null;
  provincia: string | null;
  codigoPostal: string | null;
  fechaNacimiento: string | null;
  genero: string | null;
  nacionalidad: string | null;
  avatarUrl: string | null;
  fotoPerfilUrl: string | null;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  numeroAfiliado: string | null;
  coberturaMedica?: { nombre: string; tipo: string } | null;
};

export function CitizenMobileProfile({ data, onEdit, onChangePassword }: { data: CitizenMobileProfileData; onEdit: () => void; onChangePassword: () => void }) {
  const fullName = [data.nombre, data.apellido].filter(Boolean).join(" ") || "Ciudadano";
  const address = [data.domicilio, data.localidad, data.provincia, data.codigoPostal].filter(Boolean).join(", ");
  const birthDate = data.fechaNacimiento ? format(new Date(`${String(data.fechaNacimiento).slice(0, 10)}T12:00:00`), "d 'de' MMMM 'de' yyyy", { locale: es }) : null;
  const avatar = data.avatarUrl || data.fotoPerfilUrl;

  return <main className="min-h-[calc(100dvh-var(--topbar-h)-48px)] bg-[var(--brand-page)] pb-[calc(var(--citizen-mobile-nav-h)+104px)] lg:hidden">
    <header className="relative overflow-hidden bg-gradient-to-br from-[#1D4F36] via-[#0D6541] to-[#073E2C] px-5 pb-20 pt-7 text-white">
      <div className="absolute -right-14 top-3 size-48 rounded-full bg-[#819B56]/20" />
      <div className="absolute -right-2 bottom-[-74px] h-40 w-72 rotate-[-12deg] rounded-[50%] bg-emerald-300/10" />
      <div className="relative flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-extrabold">Mi perfil</h1><p className="mt-2 max-w-48 text-sm font-medium leading-5 text-white/85">Gestioná tu información personal y de contacto.</p></div>
        <ProfileAvatar source={avatar} name={fullName} className="size-24" />
      </div>
    </header>

    <div className="relative -mt-14 space-y-3 px-4">
      <section className="flex items-center gap-3 rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-[0_8px_24px_rgba(29,79,54,0.12)]">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><UserRound className="size-7" /></span>
        <div className="min-w-0"><h2 className="truncate text-lg font-extrabold text-[var(--brand-primary)]">{fullName}</h2><p className="mt-1 flex items-center gap-2 truncate text-xs text-[var(--brand-muted)]"><Mail className="size-4 shrink-0" />{data.email}</p><p className="mt-1 flex items-center gap-2 text-xs text-[var(--brand-muted)]"><IdCard className="size-4 shrink-0" />DNI {data.documento || "Sin informar"}</p></div>
      </section>

      <ProfileSection title="Información personal" icon={UserRound}>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <ProfileValue icon={UserRound} label="Nombre(s)" value={data.nombre} />
          <ProfileValue icon={UserRound} label="Apellidos" value={data.apellido} />
          <ProfileValue icon={IdCard} label="DNI" value={data.documento} />
          <ProfileValue icon={CalendarDays} label="Fecha de nacimiento" value={birthDate} />
          <ProfileValue icon={UserRound} label="Género" value={formatEnum(data.genero)} />
          <ProfileValue icon={IdCard} label="Nacionalidad" value={formatEnum(data.nacionalidad)} />
        </div>
      </ProfileSection>

      <ProfileRow icon={MapPin} title="Domicilio" lines={[address || "Sin informar"]} />
      <ProfileRow icon={Phone} title="Teléfono" lines={[data.celular || "Sin informar"]} />
      <ProfileRow icon={Mail} title="Correo electrónico" lines={[data.email]} />
      <ProfileRow icon={ShieldPlus} title="Contacto de emergencia" lines={[data.contactoEmergenciaNombre || "Sin informar", data.contactoEmergenciaTelefono || ""]} />
      <ProfileRow icon={HeartPulse} title="Cobertura médica" lines={[data.coberturaMedica?.nombre || "Sin informar", data.numeroAfiliado ? `Afiliado N.º ${data.numeroAfiliado}` : ""]} />
    </div>

    <footer className="fixed inset-x-0 bottom-[var(--citizen-mobile-nav-h)] z-30 grid grid-cols-2 gap-2 border-t border-[var(--brand-border-soft)] bg-[#F9FAF5]/95 p-3 shadow-[0_-8px_24px_rgba(29,79,54,0.10)] backdrop-blur">
      <Button type="button" variant="outline" onClick={onChangePassword} className="h-8 rounded-lg border-[var(--brand-primary)] bg-transparent px-2 text-xs font-bold text-[var(--brand-primary)]"><KeyRound className="size-3" />Contraseña</Button>
      <Button type="button" onClick={onEdit} className="h-8 rounded-lg bg-[var(--brand-primary)] px-2 text-xs font-bold hover:bg-[var(--brand-primary-hover)]"><Pencil className="size-3" />Editar perfil</Button>
    </footer>
  </main>;
}

function ProfileAvatar({ source, name, className }: { source: string | null; name: string; className?: string }) {
  return <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white/90 bg-[var(--brand-panel)] text-2xl font-extrabold text-[var(--brand-primary)] shadow-lg", className)}>{source ? <Image src={source} alt={`Foto de ${name}`} fill unoptimized sizes="96px" className="object-cover" /> : initials(name)}</span>;
}

function ProfileSection({ title, icon: Icon, children }: { title: string; icon: typeof UserRound; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-sm"><h3 className="mb-4 flex items-center gap-2 border-b border-[var(--brand-border-soft)] pb-3 text-sm font-extrabold text-[var(--brand-primary)]"><span className="grid size-9 place-items-center rounded-full bg-[var(--brand-panel)]"><Icon className="size-4" /></span>{title}</h3>{children}</section>;
}

function ProfileValue({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string | null | undefined }) {
  return <div className="flex min-w-0 gap-2"><Icon className="mt-1 size-4 shrink-0 text-[var(--brand-secondary)]" /><div className="min-w-0"><p className="text-[10px] text-[var(--brand-muted)]">{label}</p><p className="mt-0.5 break-words text-xs font-bold text-[var(--brand-primary)]">{value || "Sin informar"}</p></div></div>;
}

function ProfileRow({ icon: Icon, title, lines }: { icon: typeof UserRound; title: string; lines: string[] }) {
  return <section className="flex items-center gap-3 rounded-2xl border border-[var(--brand-border-soft)] bg-[#F9FAF5] p-4 shadow-sm"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-panel)] text-[var(--brand-primary)]"><Icon className="size-5" /></span><div className="min-w-0"><h3 className="text-sm font-extrabold text-[var(--brand-primary)]">{title}</h3>{lines.filter(Boolean).map((line) => <p key={line} className="mt-0.5 break-words text-xs text-[var(--brand-muted)]">{line}</p>)}</div></section>;
}

function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function formatEnum(value: string | null) { return value ? value.replaceAll("_", " ").toLocaleLowerCase("es").replace(/^./, (letter) => letter.toUpperCase()) : null; }
