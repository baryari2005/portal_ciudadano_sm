import type { Stat } from "@/features/dashboard/types/types";

export type BuilderBaseParams = {
  canApprove: boolean;
  canView: boolean;
  canLoad: boolean;
};

export type DocumentsStatParams = BuilderBaseParams & {
  loadingDocs: boolean;
  pendingDocs: number;
  pathname: string;
  onGoReceipts: () => void;
};

export type VacationsStatParams = BuilderBaseParams & {
  loadingBalance: boolean;
  availableDays: number;
  loadingVacationLeaves: boolean;
  pendingVacationLeaves: number;
  onGoVacations: () => void;
};

export type LicensesStatParams = BuilderBaseParams & {
  loadingOtherLeaves: boolean;
  pendingOtherLeaves: number;
  onGoLicenses: () => void;
};

export type HolidayStatParams = {
  loadingHoliday: boolean;
  nextHoliday?: {
    base?: {
      date: Date | string;
      name: string;
      type?: string;
    };
    nonWorking?: {
      date: Date | string;
      name: string;
      type?: string;
    };
    daysUntilNonWorking?: number;
  } | null;
};

export type DashboardStatsParams = {
  documents: DocumentsStatParams;
  vacations: VacationsStatParams;
  licenses: LicensesStatParams;
  holiday: HolidayStatParams;
};

export type StatBuilderParams =
  | DocumentsStatParams
  | VacationsStatParams
  | LicensesStatParams
  | HolidayStatParams;

export type StatBuilder = (params: StatBuilderParams) => Stat;
