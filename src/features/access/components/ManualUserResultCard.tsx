"use client";

import { ChevronRight, IdCard } from "lucide-react";

import { cn } from "@/lib/utils";

import type { AccessPerson } from "../types/access.types";
import {
  AccessPersonAvatar,
  getAccessPersonFirstName,
  getAccessPersonLastName,
  getAccessPersonName,
} from "./AccessPersonAvatar";

type Props = {
  person: AccessPerson;
  selected: boolean;
  onSelect: (person: AccessPerson) => void;
};

export function ManualUserResultCard({ person, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(person)}
      className={cn(
        "grid min-h-[104px] w-full grid-cols-[auto_1fr_auto] items-center gap-5 rounded-[20px] border px-5 py-4 text-left transition hover:shadow-md",
        selected
          ? "border-[#00522C] bg-[#EEF6E9] shadow-sm ring-1 ring-[#00522C]/10"
          : "border-[#DDE8D7] bg-white hover:border-[#9CB98C]",
      )}
    >
      <AccessPersonAvatar person={person} />

      <div className="min-w-0">
        <p className="truncate text-lg font-extrabold text-[#173C2A]">
          {getAccessPersonName(person)}
        </p>
        <p className="mt-2 flex items-center gap-2 truncate text-sm font-semibold text-[#5F6F68]">
          <IdCard className="h-4 w-4 text-[#00522C]" />
          DNI {person.dni}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#5F6F68]">
          <span>
            Nombre:{" "}
            <strong className="font-extrabold text-[#315644]">
              {getAccessPersonFirstName(person)}
            </strong>
          </span>
          <span>
            Apellido:{" "}
            <strong className="font-extrabold text-[#315644]">
              {getAccessPersonLastName(person)}
            </strong>
          </span>
        </div>
      </div>

      <ChevronRight className="h-6 w-6 text-[#00522C]" />
    </button>
  );
}
