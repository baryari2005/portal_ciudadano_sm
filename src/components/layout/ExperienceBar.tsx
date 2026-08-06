"use client";

import { BriefcaseBusiness, GraduationCap, ScanLine, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExperienceKind = "administration" | "reception" | "teacher" | "citizen";

const meta = {
  administration: { label: "Portal Ciudadano - Más San Miguel - Experiencia Administrativa", icon: BriefcaseBusiness },
  reception: { label: "Portal de Recepción - Más San Miguel - Experiencia Operativa", icon: ScanLine },
  teacher: { label: "PORTAL DEL PROFESOR - MÁS SAN MIGUEL - EXPERIENCIA DOCENTE", icon: GraduationCap },
  citizen: { label: "Portal Ciudadano - Más San Miguel - Experiencia ciudadana", icon: UserRound },
} as const;

export function ExperienceBar({ experience, className }: { experience: ExperienceKind; className?: string }) {
  const { label, icon: Icon } = meta[experience];
  return (
    <div className={cn("relative h-7 shrink-0 overflow-hidden border-t border-white/15 bg-[#163D2A] px-[var(--content-pad,24px)] text-[var(--brand-accent)]", className)}>
      <span className="experience-bar-track absolute inset-y-0 left-[var(--content-pad,24px)] inline-flex w-max items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]">
        <Icon className="size-3.5" />
        {label}
      </span>
    </div>
  );
}
