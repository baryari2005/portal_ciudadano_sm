"use client";

import { IdCard, Mail, Phone, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AccessPerson } from "../types/access.types";
import { getAccessPersonName } from "./AccessPersonAvatar";

type Props = {
  person: AccessPerson | null | undefined;
  mobile?: boolean;
  showContact?: boolean;
  showPhone?: boolean;
  showStatus?: boolean;
};

/** Identity presentation shared by QR identification and manual reception search. */
export function AccessPersonCard({ person, mobile = false, showContact = false, showPhone = false, showStatus = false }: Props) {
  const name = person ? getAccessPersonName(person) : "Persona sin identificar";
  return <section data-access-person-card="" className={mobile
    ? "min-w-0 rounded-3xl border border-[var(--brand-border-soft)] bg-white p-4 shadow-sm"
    : "min-w-0 rounded-2xl bg-[var(--brand-page)] p-4"}>
    <div className="flex min-w-0 items-center gap-4">
      <Avatar className={mobile ? "size-20 shrink-0" : "size-24 shrink-0 rounded-2xl"}>
        <AvatarImage src={person?.profilePhotoUrl ?? person?.avatarUrl ?? undefined} alt={`Foto de ${name}`} className="object-cover" />
        <AvatarFallback className={mobile ? "bg-[var(--brand-panel)] text-[var(--brand-primary)]" : undefined}><UserRound /></AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
        {mobile ? <><h2 className="text-xl font-extrabold text-[var(--brand-primary)]">{name}</h2><span className="mt-1 inline-flex rounded-full bg-[var(--brand-panel)] px-2 py-1 text-[10px] font-bold text-[var(--brand-primary)]">Identificado</span><p className="mt-2 text-sm text-[var(--brand-muted)]">Persona identificada correctamente</p></>
          : <><p className="text-xs font-extrabold uppercase tracking-wide text-[var(--brand-secondary)]">Verificación visual</p><p className="font-extrabold text-[var(--brand-primary)]">{name}</p><p className="text-sm font-semibold text-[var(--brand-text)]">DNI {person?.dni || "No informado"}</p><p className="mt-1 text-xs leading-4 text-[var(--brand-muted)]">Compará esta foto con la persona presente antes de autorizar el ingreso.</p></>}
      </div>
    </div>
    {person && (mobile || showContact) ? <dl className="mt-4 divide-y divide-[var(--brand-border-soft)] rounded-2xl border border-[var(--brand-border-soft)] bg-[var(--brand-control)] px-3">
      <PersonFact icon={IdCard} label="DNI" value={person.dni || "No informado"} />
      <PersonFact icon={Mail} label="Email" value={person.email || "No informado"} />
      {showPhone ? <PersonFact icon={Phone} label="Teléfono" value="No informado" /> : null}
      {showStatus && person.estado ? <PersonFact icon={UserRound} label="Estado" value={person.estado} /> : null}
    </dl> : null}
  </section>;
}

function PersonFact({ icon: Icon, label, value }: { icon: typeof IdCard; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-3 py-3"><Icon className="mt-0.5 size-5 shrink-0 text-[var(--brand-secondary)]" /><div className="min-w-0 flex-1"><dt className="text-[10px] font-extrabold uppercase text-[var(--brand-muted)]">{label}</dt><dd className="mt-1 text-sm font-bold text-[var(--brand-ink)] [overflow-wrap:anywhere]">{value}</dd></div></div>;
}
