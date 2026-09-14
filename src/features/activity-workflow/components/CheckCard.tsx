"use client";

import { Checkbox } from "@/components/ui/checkbox";

export function CheckCard({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl border p-4 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${checked ? "border-[var(--brand-secondary)] bg-[var(--brand-panel)]" : "border-[var(--brand-border-soft)] bg-white"}`}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span className="font-bold text-[var(--brand-ink)]">{label}</span>
    </label>
  );
}
