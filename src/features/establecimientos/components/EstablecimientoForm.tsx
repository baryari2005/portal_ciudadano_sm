"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import {
  Activity,
  ArrowLeft,
  Building2,
  Clock,
  Loader2,
  Mail,
  Map,
  MapPin,
  MapPinned,
  NotebookText,
  Phone,
  Plus,
  Save,
  Trash2,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AdminFormCard, AdminFormField as Field, AdminStatusSwitchField, adminControlClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/components/shared/admin-patterns";
import { EmailInput } from "@/components/forms/EmailInput";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { GoogleAddressInput } from "@/components/forms/GoogleAddressInput";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/validation/phone";
import { ARGENTINA_PROVINCES } from "@/constants/argentina-locations";
import { ActivityImageUploader } from "@/features/actividades/components/ActivityImageUploader";

import {
  createEstablecimientoClient,
  updateEstablecimientoClient,
} from "../services/establecimientos.service";
import type {
  Establecimiento,
  EstablecimientoPayload,
  HorarioEstablecimiento,
} from "../types/establecimiento.types";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  defaultValues?: Establecimiento | null;
};

const dias = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
];

function sortHorarios(horarios: HorarioEstablecimiento[]) {
  return [...horarios].sort((left, right) => {
    const leftDay = dias.indexOf(left.diaSemana);
    const rightDay = dias.indexOf(right.diaSemana);
    const dayDifference = (leftDay < 0 ? dias.length : leftDay) - (rightDay < 0 ? dias.length : rightDay);
    return dayDifference || left.horaApertura.localeCompare(right.horaApertura);
  });
}

const emptyPayload: EstablecimientoPayload = {
  nombre: "",
  direccion: "",
  localidad: "",
  provincia: "",
  direccionPlaceId: null,
  direccionLat: null,
  direccionLng: null,
  codigoPostal: "",
  imagenUrl: null,
  email: "",
  telefono: "",
  celular: "",
  estado: "activo",
  observacion: "",
  barrio: "",
  horarios: [],
};

const inputClass = adminControlClass;

const selectClass =
  "h-11 rounded-xl border border-[var(--brand-border)] bg-[var(--brand-page)] px-3 text-sm font-medium text-[var(--brand-ink)] shadow-sm";

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateHorarios(horarios: HorarioEstablecimiento[]) {
  const openHorarios = horarios.filter((horario) => !horario.cerrado);

  for (const horario of openHorarios) {
    if (
      timeToMinutes(horario.horaApertura) >= timeToMinutes(horario.horaCierre)
    ) {
      return "La hora de apertura debe ser menor a la hora de cierre.";
    }
  }

  for (let i = 0; i < openHorarios.length; i += 1) {
    for (let j = i + 1; j < openHorarios.length; j += 1) {
      const current = openHorarios[i];
      const next = openHorarios[j];

      if (current.diaSemana !== next.diaSemana) {
        continue;
      }

      const currentStart = timeToMinutes(current.horaApertura);
      const currentEnd = timeToMinutes(current.horaCierre);
      const nextStart = timeToMinutes(next.horaApertura);
      const nextEnd = timeToMinutes(next.horaCierre);

      if (currentStart < nextEnd && nextStart < currentEnd) {
        return "Hay franjas horarias superpuestas para el mismo dia.";
      }
    }
  }

  return null;
}

export function EstablecimientoForm({ mode, defaultValues }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<EstablecimientoPayload>(emptyPayload);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [draftRanges, setDraftRanges] = useState([{ start: "09:00", end: "13:00" }]);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!defaultValues) {
      setForm(emptyPayload);
      return;
    }

    setForm({
      nombre: defaultValues.nombre,
      direccion: defaultValues.direccion,
      localidad: defaultValues.localidad ?? "",
      provincia: defaultValues.provincia ?? "",
      direccionPlaceId: defaultValues.direccionPlaceId ?? null,
      direccionLat: defaultValues.direccionLat ?? null,
      direccionLng: defaultValues.direccionLng ?? null,
      codigoPostal: defaultValues.codigoPostal ?? "",
      imagenUrl: defaultValues.imagenUrl ?? null,
      email: defaultValues.email ?? "",
      telefono: defaultValues.telefono ?? "",
      celular: defaultValues.celular ?? "",
      estado: defaultValues.estado || "activo",
      observacion: defaultValues.observacion ?? "",
      barrio: defaultValues.barrio ?? "",
      horarios: sortHorarios(defaultValues.horarios ?? []),
    });
  }, [defaultValues]);

  function setValue(name: keyof EstablecimientoPayload, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function addScheduleGroup() {
    if (!selectedDays.length) return toast.error("Seleccioná al menos un día.");
    const ranges = draftRanges.map((range) => ({ horaApertura: range.start, horaCierre: range.end }));
    if (ranges.some((range) => !range.horaApertura || !range.horaCierre || timeToMinutes(range.horaApertura) >= timeToMinutes(range.horaCierre))) return toast.error("Revisá las horas de apertura y cierre.");
    const additions = selectedDays.flatMap((diaSemana) => ranges.map((range) => ({ diaSemana, ...range, cerrado: false })));
    const error = validateHorarios([...form.horarios, ...additions]);
    if (error) return toast.error("La franja se superpone con un horario ya cargado.");
    setForm((current) => ({ ...current, horarios: sortHorarios([...current.horarios, ...additions]) }));
    setSelectedDays([]);
    setDraftRanges([{ start: "09:00", end: "13:00" }]);
  }

  function updateHorario(index: number, field: keyof HorarioEstablecimiento, value: string | boolean) {
    setForm((current) => ({ ...current, horarios: sortHorarios(current.horarios.map((horario, itemIndex) => itemIndex === index ? { ...horario, [field]: value } : horario)) }));
  }

  function removeHorario(index: number) {
    setForm((current) => ({
      ...current,
      horarios: current.horarios.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio.");
      return;
    }

    if (!form.direccion.trim()) {
      toast.error("La direccion es obligatoria.");
      return;
    }

    if (!isValidPhone(form.telefono)) {
      toast.error(PHONE_VALIDATION_MESSAGE);
      return;
    }
    if (!isValidPhone(form.celular)) {
      toast.error(PHONE_VALIDATION_MESSAGE);
      return;
    }

    const horariosError = validateHorarios(form.horarios);

    if (horariosError) {
      toast.error(horariosError);
      return;
    }

    setSubmitting(true);

    try {
      const payload: EstablecimientoPayload = {
        ...form,
        email: form.email?.trim() || null,
        telefono: form.telefono?.trim() || null,
        celular: form.celular?.trim() || null,
        localidad: form.localidad?.trim() || null,
        provincia: form.provincia?.trim() || null,
        imagenUrl: form.imagenUrl?.trim() || null,
        observacion: form.observacion?.trim() || null,
        barrio: form.barrio?.trim() || null,
      };

      const saved =
        isEdit && defaultValues?.id
          ? await updateEstablecimientoClient(defaultValues.id, payload)
          : await createEstablecimientoClient(payload);

      toast.success(
        isEdit ? "Establecimiento actualizado." : "Establecimiento creado.",
      );
      router.replace(`/facilities?selected=${saved.id}`);
    } catch (error) {
      const message =
        isAxiosError<{ message?: string }>(error) &&
        typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : "No pudimos guardar el establecimiento.";

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="establecimiento-form" className="w-full" onSubmit={handleSubmit}>
      <AdminFormCard title="Datos del establecimiento" description="Información requerida para registrar la sede y sus horarios.">
        <div className="space-y-6">
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-extrabold text-[var(--brand-ink)]">Imagen del establecimiento</p>
              <ActivityImageUploader value={form.imagenUrl ?? null} onChange={(imagenUrl) => setForm((current) => ({ ...current, imagenUrl }))} endpoint="/establecimientos/images" subject="establecimiento" maxDimension={512} allowUrl={false} sidePreview />
            </div>
            <Field label="Nombre *" icon={Building2}>
              <Input
                value={form.nombre}
                onChange={(event) => setValue("nombre", event.target.value)}
                className={inputClass}
                placeholder="Ej: Centro Municipal"
              />
            </Field>

            <div>
              <AdminStatusSwitchField checked={form.estado === "activo"} onCheckedChange={(checked) => setValue("estado", checked ? "activo" : "inactivo")} icon={Activity} activeLabel="Establecimiento activo" inactiveLabel="Establecimiento inactivo" activeDescription="Disponible para actividades, horarios y recursos." inactiveDescription="No estará disponible para nuevas asociaciones." disabled={isEdit} />
              {isEdit ? <p className="mt-1.5 text-xs text-[var(--brand-muted)]">El estado se modifica desde las acciones del detalle.</p> : null}
            </div>

            <div className="grid gap-6 sm:col-span-2 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:items-stretch"><div className="grid content-start gap-4 sm:grid-cols-2"><div className="sm:col-span-2">
              <GoogleAddressInput display="input" id="facility-address" value={form.direccion} placeId={form.direccionPlaceId} lat={form.direccionLat} lng={form.direccionLng} locality={form.localidad} province={form.provincia} postalCode={form.codigoPostal} onChange={(location) => setForm((current) => ({ ...current, direccion: location.address, direccionPlaceId: location.placeId, direccionLat: location.lat, direccionLng: location.lng, localidad: location.locality ?? current.localidad, provincia: location.province ?? current.provincia, codigoPostal: location.postalCode ?? current.codigoPostal }))} className={inputClass} placeholder="Ej: Av. Presidente Peron 1234" />
            </div>

            <Field label="Barrio" icon={MapPin}>
              <Input
                value={form.barrio ?? ""}
                onChange={(event) => setValue("barrio", event.target.value)}
                className={inputClass}
                placeholder="Ej: Centro"
              />
            </Field>

            <Field label="Localidad" icon={MapPinned}>
              <Input value={form.localidad ?? ""} onChange={(event) => setValue("localidad", event.target.value)} className={inputClass} placeholder="Ej: San Miguel" />
            </Field>

            <Field label="Provincia" icon={Map}>
              <Select value={form.provincia ?? ""} onValueChange={(value) => setValue("provincia", value)}>
                <SelectTrigger className={`${selectClass} w-full pl-9`}><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger>
                <SelectContent>{ARGENTINA_PROVINCES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Código postal" icon={MapPin}>
              <Input value={form.codigoPostal ?? ""} onChange={(event) => setValue("codigoPostal", event.target.value)} className={inputClass} placeholder="Ej: 1625" />
            </Field>

            </div><div className="min-w-0"><GoogleAddressInput display="map" id="facility-address-map" value={form.direccion} placeId={form.direccionPlaceId} lat={form.direccionLat} lng={form.direccionLng} locality={form.localidad} province={form.provincia} postalCode={form.codigoPostal} onChange={(location) => setForm((current) => ({ ...current, direccion: location.address, direccionPlaceId: location.placeId, direccionLat: location.lat, direccionLng: location.lng, localidad: location.locality ?? current.localidad, provincia: location.province ?? current.provincia, codigoPostal: location.postalCode ?? current.codigoPostal }))} /></div></div>

            <Field label="Email" icon={Mail}>
              <EmailInput
                id="email"
                value={form.email ?? ""}
                onChange={(value) => setValue("email", value)}
                className={inputClass}
                placeholder="Ej: sede@mail.com"
                withIcon={false}
              />
            </Field>

            <Field label="Teléfono fijo" icon={Phone}>
              <PhoneInput
                id="telefono"
                value={form.telefono ?? ""}
                onChange={(value) => setValue("telefono", value)}
                className={inputClass}
                withIcon={false}
              />
            </Field>

            <Field label="Celular" icon={Smartphone}>
              <PhoneInput id="celular" value={form.celular ?? ""} onChange={(value) => setValue("celular", value)} className={inputClass} withIcon={false} />
            </Field>

            <Field label="Observaciones" icon={NotebookText} className="sm:col-span-2" align="start">
              <Textarea
                value={form.observacion ?? ""}
                onChange={(event) =>
                  setValue("observacion", event.target.value)
                }
                className={`${inputClass} min-h-28 resize-y py-3`}
                placeholder="Ej: Ingreso por calle lateral, indicaciones de acceso u otra información relevante."
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-[#D7E0D8] pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-normal text-[var(--brand-primary)]">
                  Horarios de apertura
                </p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                  Carga una o mas franjas por dia, por ejemplo 08:00 a 12:00 y
                  14:00 a 18:00.
                </p>
              </div>
              <span className="rounded-full border border-[var(--brand-secondary)]/40 bg-[var(--brand-secondary)]/15 px-3 py-1 text-xs font-bold text-[var(--brand-primary)]">{draftRanges.length > 1 ? "Jornada partida" : "Jornada completa"}</span>
            </div>

            <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-control)] p-4 sm:p-5">
              <p className="text-sm font-extrabold text-[var(--brand-primary)]">1. Seleccioná los días</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dias.map((dia) => <label key={dia} className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--brand-border)] bg-white px-3 py-2 text-sm font-bold text-[var(--brand-ink)]"><Checkbox checked={selectedDays.includes(dia)} onCheckedChange={(checked) => setSelectedDays((current) => checked ? [...current, dia] : current.filter((item) => item !== dia))} />{dia.charAt(0) + dia.slice(1).toLowerCase()}</label>)}
              </div>
              <p className="mt-5 text-sm font-extrabold text-[var(--brand-primary)]">2. Definí una o más franjas</p>
              <div className="mt-3 grid gap-3">
                {draftRanges.map((range, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Input aria-label={`Apertura franja ${index + 1}`} type="time" value={range.start} onChange={(event) => setDraftRanges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item))} className={inputClass} /><Input aria-label={`Cierre franja ${index + 1}`} type="time" value={range.end} onChange={(event) => setDraftRanges((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item))} className={inputClass} /><Button type="button" variant="outline" disabled={draftRanges.length === 1} onClick={() => setDraftRanges((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="h-11 rounded-xl border-[var(--brand-border)] bg-white text-red-700"><Trash2 />Quitar</Button></div>)}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setDraftRanges((current) => [...current, { start: "14:00", end: "20:00" }])} className="h-11 rounded-xl border-[var(--brand-border)] bg-white font-bold text-[var(--brand-primary)]"><Plus />Agregar otra franja</Button>
                <Button type="button" onClick={addScheduleGroup} className="h-11 rounded-xl bg-[var(--brand-primary)] px-5 font-bold text-white"><Plus />Agregar horario</Button>
              </div>
              <p className="mt-3 text-xs font-medium text-[var(--brand-muted)]">El sistema no permite franjas superpuestas para un mismo día.</p>
            </div>

            <div className="grid gap-3">
              {form.horarios.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-[var(--brand-border)] bg-[var(--brand-page)] px-4 py-8 text-center text-sm font-medium text-[var(--brand-muted)]">
                  Sin horarios cargados.
                </div>
              ) : null}

              {form.horarios.map((horario, index) => (
                <div
                  key={`${horario.id ?? "nuevo"}-${index}`}
                  className="grid gap-3 rounded-[18px] border border-[#D7E0D8] bg-[var(--brand-page)] p-4 lg:grid-cols-[auto_1.2fr_1fr_1fr_auto_auto] lg:items-center"
                >
                  <span className="w-fit rounded-full bg-[var(--brand-secondary)]/15 px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)]">{form.horarios.filter((item) => item.diaSemana === horario.diaSemana && !item.cerrado).length > 1 ? "Partida" : "Completa"}</span>
                  <Select
                    value={horario.diaSemana}
                    onValueChange={(value) =>
                      updateHorario(index, "diaSemana", value)
                    }
                  >
                    <SelectTrigger className={`${selectClass} w-full`}>
                      <SelectValue placeholder="Seleccionar dia" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--brand-border)] bg-[var(--brand-page)] text-[var(--brand-ink)]">
                      {dias.map((dia) => (
                        <SelectItem
                          key={dia}
                          value={dia}
                          className="focus:bg-[var(--brand-highlight)] focus:text-[var(--brand-heading)] data-[highlighted]:bg-[var(--brand-highlight)] data-[highlighted]:text-[var(--brand-heading)]"
                        >
                          {dia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    className={inputClass}
                    type="time"
                    value={horario.horaApertura}
                    disabled={horario.cerrado}
                    onChange={(event) =>
                      updateHorario(index, "horaApertura", event.target.value)
                    }
                  />

                  <Input
                    className={inputClass}
                    type="time"
                    value={horario.horaCierre}
                    disabled={horario.cerrado}
                    onChange={(event) =>
                      updateHorario(index, "horaCierre", event.target.value)
                    }
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-[var(--brand-border)] bg-white/50 font-bold text-[var(--brand-ink)] hover:bg-white"
                    onClick={() =>
                      updateHorario(index, "cerrado", !horario.cerrado)
                    }
                  >
                    <Clock className="h-4 w-4" />
                    {horario.cerrado ? "Abrir" : "Cerrar"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl border-[var(--brand-border)] bg-white/50 font-bold text-red-700 hover:bg-red-50"
                    onClick={() => removeHorario(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminFormCard>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          asChild
          type="button"
          variant="outline"
          className={`${adminSecondaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
        >
          <Link href="/facilities">
            <ArrowLeft className="h-5 w-5" />
            Volver
          </Link>
        </Button>

        <Button
          type="submit"
          size="lg"
          className={`${adminPrimaryButtonClass} w-full justify-center gap-3 sm:w-auto`}
          disabled={submitting}
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <Save className="h-4 w-4" />
              {isEdit ? "Guardar cambios" : "Crear establecimiento"}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
