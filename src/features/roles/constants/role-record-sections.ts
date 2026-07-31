export const ROLE_RECORD_SECTIONS = ["overview", "permissions"] as const;

export type RoleRecordSection = (typeof ROLE_RECORD_SECTIONS)[number];
