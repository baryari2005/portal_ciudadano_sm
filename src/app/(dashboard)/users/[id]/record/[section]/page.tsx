import { notFound } from "next/navigation";

import { UserRecordPage } from "@/features/users/components/record/UserRecordPage";
import { USER_RECORD_SECTIONS, type UserRecordSection } from "@/features/users/constants/user-record-sections";

export default async function Page({ params }: { params: Promise<{ id: string; section: string }> }) {
  const { id, section } = await params;
  if (!USER_RECORD_SECTIONS.includes(section as UserRecordSection)) notFound();
  return <UserRecordPage userId={id} section={section as UserRecordSection} />;
}
