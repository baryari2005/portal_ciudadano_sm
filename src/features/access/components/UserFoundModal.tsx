"use client";

import { IdCard, ShieldCheck, UserCheck, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { AccessPerson } from "../types/access.types";
import {
  AccessPersonAvatar,
  getAccessPersonFirstName,
  getAccessPersonLastName,
  getAccessPersonName,
} from "./AccessPersonAvatar";

type Props = {
  person: AccessPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserFoundModal({ person, open, onOpenChange }: Props) {
  if (!person) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[24px] border-[#DDE8D7] bg-[#EEF6E9] p-0 text-[#173C2A] shadow-[0_24px_70px_rgba(0,58,34,0.18)] sm:max-w-lg">
        <DialogHeader className="border-b border-[#C9D9C3] bg-[#EEF6E9] px-6 py-5">
          <div className="flex items-start gap-3 text-left">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-[#DDEED2] text-[#00522C]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-extrabold text-[#003A22]">
                Persona encontrada
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-[#315644]">
                Usuario identificado correctamente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-[#EEF6E9] px-6 py-7">
          <div className="flex items-center gap-5">
            <div className="rounded-[18px] bg-[#DDEED2] p-3">
              <AccessPersonAvatar person={person} size="lg" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-extrabold text-[#003A22]">
                {getAccessPersonName(person)}
              </h3>
              <p className="mt-1 text-base font-semibold text-[#315644]">
                Usuario identificado correctamente.
              </p>
            </div>
          </div>

          <div className="my-7 h-px bg-[#C9D9C3]" />

          <dl className="grid gap-5">
            <div className="grid grid-cols-[auto_1fr] gap-4">
              <UserRound className="mt-0.5 h-6 w-6 text-[#00522C]" />
              <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                <dt className="font-extrabold text-[#173C2A]">Nombre:</dt>
                <dd className="font-medium text-[#315644]">
                  {getAccessPersonFirstName(person)}
                </dd>
              </div>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-4">
              <UserCheck className="mt-0.5 h-6 w-6 text-[#00522C]" />
              <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                <dt className="font-extrabold text-[#173C2A]">Apellido:</dt>
                <dd className="font-medium text-[#315644]">
                  {getAccessPersonLastName(person)}
                </dd>
              </div>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-4">
              <IdCard className="mt-0.5 h-6 w-6 text-[#00522C]" />
              <div className="grid gap-1 sm:grid-cols-[130px_1fr]">
                <dt className="font-extrabold text-[#173C2A]">DNI:</dt>
                <dd className="font-medium text-[#315644]">{person.dni}</dd>
              </div>
            </div>
          </dl>
        </div>

        <DialogFooter className="border-t border-[#C9D9C3] bg-[#EEF6E9] px-6 py-4">
          <DialogClose asChild>
            <Button className="h-11 rounded-xl bg-[#00522C] px-6 font-bold text-white hover:bg-[#003A22]">
              Cerrar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
