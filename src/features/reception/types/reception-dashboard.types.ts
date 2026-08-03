export type ReceptionAccessResult = "PERMITIDO" | "RECHAZADO";

export type ReceptionDashboardData = {
  establishment: { id: string; name: string };
  metrics: {
    totalEntries: number;
    allowedEntries: number;
    rejectedEntries: number;
    attendedPeople: number;
  };
  recentAccesses: Array<{
    id: string;
    occurredAt: string;
    personName: string | null;
    documentNumber: string | null;
    result: ReceptionAccessResult;
    origin: string;
    operatorName: string | null;
  }>;
  upcomingSessions: Array<{
    id: string;
    date: string;
    startTime: string;
    activityName: string;
  }>;
  updatedAt: string;
};
