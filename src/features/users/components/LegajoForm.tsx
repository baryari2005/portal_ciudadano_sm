"use client";

import {
  useForm,
  type SubmitHandler,
  type Resolver,
  Controller,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  legajoSchema,
  type LegajoValues,
  EMPLOYMENT_STATUS,
  CONTRACT_TYPES,
} from "@/features/users/schemas/legajo.schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2 } from "lucide-react";
import { formatMessage } from "@/utils/formatters";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCan } from "@/hooks/useCan";

/** Acepta "YYYY-MM-DD", ISO, o vacío y devuelve "YYYY-MM-DD" o "" (local) */
const toInputDate = (v?: string | null) => {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // ya viene en YMD
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Date -> "YYYY-MM-DD" usando hora local */
const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** "YYYY-MM-DD" -> Date en **hora local** (evitar 'Z'); usar las 12:00 para esquivar DST */
const ymdToLocalDate = (s?: string | null) =>
  s ? new Date(`${s}T12:00:00`) : null;

const toTitle = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase());

const SMALL = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "o",
  "u",
  "a",
  "en",
  "para",
  "por",
  "con",
  "sin",
  "al",
]);
const smartTitleCase = (raw: string) => {
  const s = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return "";
  return s
    .split(" ")
    .map((w, i) =>
      i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(" ");
};

type Props = {
  defaultValues: Partial<LegajoValues>;
  onSubmit: SubmitHandler<LegajoValues>; // 👈 tipar así
};

export function LegajoForm({ defaultValues, onSubmit }: Props) {
  const form = useForm<LegajoValues>({
    resolver: zodResolver(legajoSchema) as unknown as Resolver<LegajoValues>,
    defaultValues: {
      employeeNumber: defaultValues.employeeNumber ?? undefined,
      admissionDate: toInputDate(defaultValues.admissionDate),
      terminationDate: toInputDate(defaultValues.terminationDate),
      employmentStatus: defaultValues.employmentStatus ?? "ACTIVO",
      contractType: defaultValues.contractType ?? undefined,
      position: defaultValues.position ?? "",
      area: defaultValues.area ?? "",
      department: defaultValues.department ?? "",
      category: defaultValues.category ?? "",
      matriculaProvincial: defaultValues.matriculaProvincial ?? "",
      matriculaNacional: defaultValues.matriculaNacional ?? "",
      notes: defaultValues.notes ?? "",
    },
    mode: "onSubmit",
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    handleSubmit,
  } = form;

  const toUpper = (v: string) => v.trim().toUpperCase();

  // const onInvalid: SubmitErrorHandler<LegajoValues> = (errs) => {
  //   console.group("❌ RHF onInvalid (LegajoForm)");
  //   console.log("Errores:", errs);
  //   const firstKey = Object.keys(errs)[0];
  //   console.log("Primer campo con error:", firstKey);
  //   console.groupEnd();
  // };

  const handleSubmitWithLogs = handleSubmit(
    async (values) => {
      console.group("✅ SUBMIT válido (LegajoForm)");
      console.log("Payload:", values);
      console.groupEnd();
      await onSubmit(values);
    },
    (errs) => {
      console.group("❌ RHF onInvalid (LegajoForm)");
      console.log("Errores detectados:", errs);
      console.log("Primer campo con error:", Object.keys(errs)[0]);
      console.groupEnd();
    },
  );

  const canEdit = useCan("legajo", "editar");

  return (
    <form
      noValidate // 👈 desactiva validaciones del navegador
      onSubmit={(e) => {
        e.preventDefault(); // 👈 evita que el navegador bloquee el submit
        console.log("🟢 Form SUBMIT event triggered");
        handleSubmitWithLogs(e);
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      {/* N° Legajo */}
      <div className="space-y-1">
        <Label>Legajo</Label>
        <Input
          type="number"
          className="h-11 rounded border pr-3"
          {...register("employeeNumber", {
            setValueAs: (v) =>
              v === "" || v === null || v === undefined ? undefined : Number(v),
          })}
        />
        {errors.employeeNumber && (
          <p className="text-xs text-red-600">
            {String(errors.employeeNumber.message)}
          </p>
        )}
      </div>

      {/* Fechas */}
      <div className="space-y-1">
        <Label>Fecha de ingreso</Label>
        <Controller
          control={form.control}
          name="admissionDate"
          render={({ field }) => {
            //const selected = ymdToUTCDate(field.value);
            const selected = ymdToLocalDate(field.value);
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-start h-11 rounded border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {selected ? (
                      format(selected, "dd/MM/yyyy", { locale: es })
                    ) : (
                      <span className="text-muted-foreground">
                        Seleccionar fecha
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selected ?? undefined}
                    //onSelect={(d) => field.onChange(d ? toYMD(d) : null)}
                    onSelect={(d) => field.onChange(d ? toYMD(d) : null)}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            );
          }}
        />
        {errors.admissionDate && (
          <p className="text-xs text-red-600">
            {String(errors.admissionDate.message)}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Fecha de egreso</Label>
        <Controller
          control={form.control}
          name="terminationDate"
          render={({ field }) => {
            //const selected = ymdToUTCDate(field.value);
            const selected = ymdToLocalDate(field.value);
            return (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full justify-start h-11 rounded border"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    {selected ? (
                      format(selected, "dd/MM/yyyy", { locale: es })
                    ) : (
                      <span className="text-muted-foreground">
                        Seleccionar fecha
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selected ?? undefined}
                    onSelect={(d) => field.onChange(d ? toYMD(d) : null)}
                    initialFocus
                    captionLayout="dropdown"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            );
          }}
        />
        {errors.terminationDate && (
          <p className="text-xs text-red-600">
            {String(errors.terminationDate.message)}
          </p>
        )}
      </div>

      {/* Estado */}
      <div className="space-y-1">
        <Label>Estado</Label>
        <Select
          value={watch("employmentStatus")}
          onValueChange={(val) =>
            setValue(
              "employmentStatus",
              val as LegajoValues["employmentStatus"],
              {
                shouldValidate: true,
              },
            )
          }
        >
          <SelectTrigger className="w-full h-11 rounded border px-3 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_STATUS.map((t) => (
              <SelectItem key={t} value={t}>
                {toTitle(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.employmentStatus && (
          <p className="text-xs text-red-600">
            {String(errors.employmentStatus.message)}
          </p>
        )}
      </div>

      {/* Tipo de contratación */}
      <div className="space-y-1">
        <Label>Tipo de contratación</Label>
        <Select
          value={watch("contractType") ?? ""}
          onValueChange={(val) =>
            setValue(
              "contractType",
              (val || null) as LegajoValues["contractType"],
              {
                shouldValidate: true,
              },
            )
          }
        >
          <SelectTrigger className="w-full h-11 rounded border px-3 text-sm">
            <SelectValue placeholder="Seleccionar" />
          </SelectTrigger>
          <SelectContent>
            {CONTRACT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {toTitle(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.contractType && (
          <p className="text-xs text-red-600">
            {String(errors.contractType.message)}
          </p>
        )}
      </div>

      {/* Campos libres */}
      <div className="space-y-1">
        <Label>Cargo / Puesto</Label>
        <Input
          className="h-11 rounded border pr-3"
          {...register("position", {
            setValueAs: (v) => smartTitleCase(String(v ?? "")),
          })}
          onBlur={(e) =>
            setValue("position", smartTitleCase(e.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>

      <div className="space-y-1">
        <Label>Área</Label>
        <Input
          className="h-11 rounded border pr-3"
          {...register("area", {
            setValueAs: (v) => smartTitleCase(String(v ?? "")),
          })}
          onBlur={(e) =>
            setValue("area", smartTitleCase(e.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>

      <div className="space-y-1">
        <Label>Departamento</Label>
        <Input
          className="h-11 rounded border pr-3"
          {...register("department", {
            setValueAs: (v) => smartTitleCase(String(v ?? "")),
          })}
          onBlur={(e) =>
            setValue("department", smartTitleCase(e.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>

      <div className="space-y-1">
        <Label>Categoría</Label>
        <Input
          className="h-11 rounded border pr-3"
          {...register("category", {
            setValueAs: (v) => smartTitleCase(String(v ?? "")),
          })}
          onBlur={(e) =>
            setValue("category", smartTitleCase(e.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </div>

      {/* Matrículas */}
      <div className="space-y-1">
        <Label>Matrícula provincial</Label>
        <Input
          className="h-11 rounded border pr-3"
          {...register("matriculaProvincial", {
            setValueAs: (v) => toUpper(String(v ?? "")),
          })}
          onBlur={(e) =>
            setValue("matriculaProvincial", toUpper(e.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          placeholder="Ej: MP 1234"
        />
        {errors.matriculaProvincial && (
          <p className="text-xs text-red-600">
            {String(errors.matriculaProvincial.message)}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Matrícula nacional</Label>
        <Input
          className="h-11 rounded border pr-3"
          {...register("matriculaNacional", {
            setValueAs: (v) => toUpper(String(v ?? "")),
          })}
          onBlur={(e) =>
            setValue("matriculaNacional", toUpper(e.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          placeholder="Ej: MN 5678"
        />
        {errors.matriculaNacional && (
          <p className="text-xs text-red-600">
            {String(errors.matriculaNacional.message)}
          </p>
        )}
      </div>

      <div className="md:col-span-2 space-y-1">
        <Label>Observaciones</Label>
        <Textarea
          rows={4}
          className="rounded border pr-3"
          {...register("notes")}
        />
      </div>

      {canEdit && (
        <div className="md:col-span-2">
          <Button
            type="submit"
            className="w-full h-11 rounded bg-[#008C93] hover:bg-[#007381] cursor-pointer"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                {formatMessage("Guardando...")}
              </span>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      )}
    </form>
  );
}
