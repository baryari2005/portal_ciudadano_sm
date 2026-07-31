"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function ManualUserSearchInput({ value, onChange }: Props) {
  return (
    <div className="relative">
      <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#00522C]" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar por DNI, nombre o apellido..."
        className="h-14 rounded-2xl border-[#DDE8D7] bg-white pl-14 pr-5 text-base font-semibold text-[#173C2A] shadow-sm placeholder:text-[#789083] focus-visible:border-[#00522C] focus-visible:ring-[#819B56]/25"
      />
    </div>
  );
}
