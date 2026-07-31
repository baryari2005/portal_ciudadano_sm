import { notFound } from "next/navigation";

import { RoleRecordPage } from "@/features/roles/components/management/RoleRecordPage";
import { ROLE_RECORD_SECTIONS, type RoleRecordSection } from "@/features/roles/constants/role-record-sections";

export default async function Page({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  const roleId = Number(id);
  if (!Number.isInteger(roleId) || roleId <= 0 || !ROLE_RECORD_SECTIONS.includes(section as RoleRecordSection)) notFound();
  return <RoleRecordPage roleId={roleId} section={section as RoleRecordSection} />;
}
