import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";

export function fmtShortDate(value?: Date | string | null) {
  if (!value) return "";

  const date = typeof value === "string" ? parseISO(value) : value;

  if (!isValid(date)) return "";

  return format(date, "dd/MM", { locale: es });
}

export function getDisplayName(
  user?: {
    nombre?: string | null;
    apellido?: string | null;
    userId?: string | null;
    email?: string | null;
  } | null,
) {
  const fullName = [user?.nombre, user?.apellido]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user?.userId || user?.email || "Usuario";
}
