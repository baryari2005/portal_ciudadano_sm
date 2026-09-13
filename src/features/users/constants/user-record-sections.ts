export const USER_RECORD_SECTIONS = [
  "personal-data",
  "system-access",
  "address",
  "contact",
  "images",
  "overview",
  "documents",
  "enrollments",
  "attendance",
  "participation",
  "access",
] as const;

export type UserRecordSection = typeof USER_RECORD_SECTIONS[number];
