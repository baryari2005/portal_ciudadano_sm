import { notFound } from "next/navigation";
import { TeacherCitizenRecordPage, type TeacherCitizenRecordSection } from "@/features/teacher/components/TeacherCitizenRecordPage";

const recordSections: readonly TeacherCitizenRecordSection[] = ["personal-data", "address", "contact", "images", "documents"];

export default async function Page({ params }: { params: Promise<{ citizenId: string; section: string }> }) {
  const { citizenId, section } = await params;
  if (!recordSections.includes(section as TeacherCitizenRecordSection)) notFound();
  return <TeacherCitizenRecordPage citizenId={citizenId} section={section as TeacherCitizenRecordSection}/>;
}
