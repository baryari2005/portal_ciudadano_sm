"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ActividadPayload } from "../types/actividad.types";
import { ActivityImageUploader } from "./ActivityImageUploader";

const controlClass = "rounded-xl border-[var(--brand-border)] bg-[var(--brand-page)] text-[var(--brand-ink)]";

export function ActivityGeneralDetailsFields({
  value,
  onChange,
}: {
  value: ActividadPayload;
  onChange: (changes: Partial<ActividadPayload>) => void;
}) {
  const validColor = /^#[0-9A-Fa-f]{6}$/.test(value.color ?? "")
    ? value.color!
    : "var(--brand-primary)";

  return (
    <>
      <section className="space-y-4 border-t border-[#D7E0D8] pt-6">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--brand-primary)]">
            Información general
          </p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Contenido e identidad visual de la actividad.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="activity-short-description">
              Descripción corta
            </Label>
            <Input
              id="activity-short-description"
              maxLength={180}
              className={controlClass}
              value={value.descripcionCorta ?? ""}
              onChange={(event) =>
                onChange({ descripcionCorta: event.target.value })
              }
            />
            <p className="text-right text-xs text-[var(--brand-muted)]">
              {value.descripcionCorta?.length ?? 0}/180
            </p>
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="activity-description">Descripción completa</Label>
            <Textarea
              id="activity-description"
              className={`${controlClass} min-h-28`}
              value={value.descripcion ?? ""}
              onChange={(event) =>
                onChange({ descripcion: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-image">Imagen de la actividad</Label>
            <ActivityImageUploader value={value.imagenUrl ?? null} onChange={(imagenUrl) => onChange({ imagenUrl })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity-color">Color identificador</Label>
            <div className="flex gap-2">
              <Input
                id="activity-color"
                className={controlClass}
                placeholder="var(--brand-primary)"
                value={value.color ?? ""}
                onChange={(event) =>
                  onChange({ color: event.target.value.toUpperCase() })
                }
              />
              <Input
                type="color"
                aria-label="Seleccionar color"
                className="h-10 w-14 cursor-pointer p-1"
                value={validColor}
                onChange={(event) =>
                  onChange({ color: event.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--brand-muted)]">
              <span
                className="size-5 rounded-full border"
                style={{ backgroundColor: validColor }}
              />
              {value.color || "Color heredado de categoría"}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-[#D7E0D8] pt-6">
        <div>
          <p className="text-sm font-bold uppercase text-[var(--brand-primary)]">
            Modalidad económica
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Modalidad</Label>
            <Select
              value={value.esGratuita ? "free" : "paid"}
              onValueChange={(mode) =>
                onChange({
                  esGratuita: mode === "free",
                  precio: mode === "free" ? null : value.precio,
                })
              }
            >
              <SelectTrigger className={`${controlClass} w-full`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Gratuita</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!value.esGratuita ? (
            <Field label="Precio *">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-[var(--brand-primary)]">
                  $
                </span>
                <Input
                  inputMode="decimal"
                  className={`${controlClass} pl-8`}
                  placeholder="15000.00"
                  value={value.precio ?? ""}
                  onChange={(event) => onChange({ precio: event.target.value })}
                />
              </div>
              <p className="text-xs text-[var(--brand-muted)]">
                Importe en pesos argentinos (ARS).
              </p>
            </Field>
          ) : (
            <p className="self-end rounded-xl bg-[#E7F0E2] p-3 text-sm text-[var(--brand-text)]">
              Las actividades gratuitas no guardan precio.
            </p>
          )}
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
