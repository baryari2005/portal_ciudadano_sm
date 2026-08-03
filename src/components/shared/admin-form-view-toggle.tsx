"use client";

import { Columns3, LayoutList } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AdminFormViewToggle({ value, onChange }: { value: "workflow" | "full"; onChange: (value: "workflow" | "full") => void }) {
  return (
    <section className="mb-5 rounded-2xl border border-[var(--brand-border)] bg-white/75 p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <h2 className="font-extrabold text-[var(--brand-heading)]">Visualización del formulario</h2>
        <p className="mt-1 text-sm font-medium text-[var(--brand-muted)]">Elegí si querés completar la información por pasos o consultar todos los campos en una sola pantalla.</p>
      </div>
      <div className="mt-4 grid shrink-0 grid-cols-2 gap-2 sm:mt-0" aria-label="Modo de visualización">
        <Button type="button" variant={value === "workflow" ? "default" : "ghost"} className={value === "workflow" ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]" : "text-[var(--brand-primary)]"} onClick={() => onChange("workflow")}><Columns3 />Por pasos</Button>
        <Button type="button" variant={value === "full" ? "default" : "ghost"} className={value === "full" ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]" : "text-[var(--brand-primary)]"} onClick={() => onChange("full")}><LayoutList />Formulario completo</Button>
      </div>
    </section>
  );
}
