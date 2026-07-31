import type { Stat } from "@/features/dashboard/types/types";
import type { DashboardStatsParams } from "../../types/dashboardBuilders";
import { buildDocumentsStat } from "./buildDocumentsStat";
import { buildVacationsStat } from "./buildVacationsStat";

import { buildHolidayStat } from "./buildHolidayStat";
import { buildLicensesStat } from "./buildLicensesStats";

export function buildDashboardStats({
  documents,
  vacations,
  licenses,
  holiday,
}: DashboardStatsParams): Stat[] {
  return [
    buildDocumentsStat(documents),
    buildVacationsStat(vacations),
    buildLicensesStat(licenses),
    buildHolidayStat(holiday),
  ];
}
