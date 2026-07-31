export const ACTIVITY_SCHEDULE_RECORD_SECTIONS = [
  "overview",
  "assignments",
  "sessions",
  "enrollments",
] as const;

export type ActivityScheduleRecordSection =
  (typeof ACTIVITY_SCHEDULE_RECORD_SECTIONS)[number];
