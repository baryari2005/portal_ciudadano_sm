export const USER_RECORD_SECTIONS = [
  "overview",
  "documents",
  "enrollments",
  "attendance",
  "participation",
  "access",
] as const;

export type UserRecordSection = typeof USER_RECORD_SECTIONS[number];
