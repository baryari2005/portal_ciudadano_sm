export const DATABASE_RESET_CONFIRMATION = "REINICIAR BASE DE DATOS";

export type DatabaseResetPreview = {
  adminEmail: string;
  users: number;
  activities: number;
  establishments: number;
  professors: number;
  enrollments: number;
  sessions: number;
  personalDocuments: number;
  notifications: number;
  auditRecords: number;
};
