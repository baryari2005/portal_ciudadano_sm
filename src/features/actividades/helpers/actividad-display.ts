import type {
  Actividad,
  ActividadEstado,
  ActividadNivel,
} from "../types/actividad.types";

const DEFAULT_ACTIVITY_COLOR = "var(--brand-primary)";

const levelLabels: Record<ActividadNivel, string> = {
  INICIAL: "Inicial",
  INTERMEDIO: "Intermedio",
  AVANZADO: "Avanzado",
};

const stateLabels: Record<ActividadEstado, string> = {
  BORRADOR: "Borrador",
  ACTIVA: "Activa",
  SIN_CUPO: "Sin cupo",
  SUSPENDIDA: "Suspendida",
  BLOQUEADA: "Bloqueada",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  INACTIVA: "Inactiva",
  COMPLETA: "Completa",
};

export function formatActividadEstado(state: ActividadEstado) {
  return stateLabels[state];
}

export function formatActividadLevel(level: ActividadNivel | null | undefined) {
  return level ? levelLabels[level] : "Sin nivel definido";
}

export function formatActividadAgeRange(
  minimum: number | null | undefined,
  maximum: number | null | undefined,
) {
  if (minimum == null && maximum == null) return "Sin límite de edad";
  if (minimum != null && maximum == null) return `Desde ${minimum} años`;
  if (minimum == null && maximum != null) return `Hasta ${maximum} años`;
  return `De ${minimum} a ${maximum} años`;
}

export function formatCurrencyARS(value: string | null | undefined) {
  if (value == null) return "Sin precio";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
    .format(Number(value))
    .replace(/\u00a0/g, " ");
}

export function formatActividadPrice(
  activity: Pick<Actividad, "esGratuita" | "precio">,
) {
  return activity.esGratuita ? "Gratuita" : formatCurrencyARS(activity.precio);
}

export function resolveActividadColor(
  ownColor: string | null | undefined,
  categoryColor: string | null | undefined,
) {
  return ownColor || categoryColor || DEFAULT_ACTIVITY_COLOR;
}

export const getActividadEffectiveColor = resolveActividadColor;

export function getActividadImage(value: string | null | undefined) {
  return isSafeActivityImageSource(value) ? value ?? null : null;
}

export function isSafeActivityImageSource(value: string | null | undefined) {
  if (!value) return false;
  if (/^\/(?!\/)[^\s<>\\]*$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
