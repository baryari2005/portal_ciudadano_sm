"use client";

import { IdCard, UserCheck, UserRound } from "lucide-react";

import type { AccessPerson } from "../types/access.types";
import {
  AccessPersonAvatar,
  getAccessPersonFirstName,
  getAccessPersonLastName,
  getAccessPersonName,
} from "./AccessPersonAvatar";

type Props = {
  person: AccessPerson | null;
};

export function ManualUserDetailPanel({ person }: Props) {
  if (!person) {
    return (
      <aside className="flex h-full min-h-[360px] items-center justify-center rounded-[24px] bg-[#EEF6E9] p-8 text-center font-semibold text-[#5F6F68]">
        Selecciona una persona para verificar su identidad.
      </aside>
    );
  }

  return (
    <aside className="h-full min-h-[360px] overflow-y-auto rounded-[24px] bg-[#EEF6E9] p-8 text-[#173C2A] shadow-sm">
      <div className="flex items-center gap-5">
        <div className="rounded-[18px] bg-[#DDEED2] p-3">
          <AccessPersonAvatar person={person} size="lg" />
        </div>

        <div className="min-w-0">
          <h3 className="mt-1 truncate text-2xl font-extrabold text-[#003A22]">
            {getAccessPersonName(person)}
          </h3>
          <p className="mt-1 text-base font-semibold text-[#315644]">
            Persona encontrada
          </p>
        </div>
      </div>

      <div className="my-7 h-px bg-[#C9D9C3]" />

      <p className="max-w-xl text-base font-medium leading-6 text-[#315644]">
        Usuario identificado correctamente.
      </p>

      <div className="my-7 h-px bg-[#C9D9C3]" />

      <dl className="grid gap-5">
        <div className="grid grid-cols-[auto_1fr] gap-4">
          <UserRound className="mt-0.5 h-6 w-6 text-[#00522C]" />
          <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
            <dt className="font-extrabold text-[#173C2A]">Nombre:</dt>
            <dd className="font-medium text-[#315644]">
              {getAccessPersonFirstName(person)}
            </dd>
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4">
          <UserCheck className="mt-0.5 h-6 w-6 text-[#00522C]" />
          <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
            <dt className="font-extrabold text-[#173C2A]">Apellido:</dt>
            <dd className="font-medium text-[#315644]">
              {getAccessPersonLastName(person)}
            </dd>
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-4">
          <IdCard className="mt-0.5 h-6 w-6 text-[#00522C]" />
          <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
            <dt className="font-extrabold text-[#173C2A]">DNI:</dt>
            <dd className="font-medium text-[#315644]">{person.dni}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-7 rounded-[18px] bg-white/55 p-5">
        <div className="flex items-start gap-3">
          <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#00522C]" />
          <p className="text-sm font-semibold leading-5 text-[#315644]">
            Esta pantalla es solo informativa. No registra ingresos ni autoriza
            accesos.
          </p>
        </div>
      </div>
    </aside>
  );
}
