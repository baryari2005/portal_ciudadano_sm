import type { Stat } from "@/features/dashboard/types/types";
import type { HolidayStatParams } from "../../types/dashboardBuilders";
import { fmtShortDate } from "../../utils/dashboardFormat";

export function buildHolidayStat({
  loadingHoliday,
  nextHoliday,
}: HolidayStatParams): Stat {
  const holidayLabelBottom = loadingHoliday
    ? "Cargando…"
    : nextHoliday?.base && nextHoliday?.nonWorking
      ? `${fmtShortDate(nextHoliday.base.date)} ${nextHoliday.base.name}\n${fmtShortDate(nextHoliday.nonWorking.date)} ${
          nextHoliday.nonWorking.type === "puente"
            ? "Feriado puente no laborable"
            : nextHoliday.nonWorking.name
        }`
      : "Sin datos";

  return {
    id: "holiday",
    labelTop: "Próximo feriado",
    labelBottom: holidayLabelBottom,
    value: loadingHoliday ? 0 : (nextHoliday?.daysUntilNonWorking ?? 0),
    iconName: nextHoliday?.nonWorking?.type === "puente" ? "Palmtree" : "Gift",
  };
}
