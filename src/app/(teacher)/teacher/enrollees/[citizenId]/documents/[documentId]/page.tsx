import { TeacherCitizenDocumentPage } from "@/features/teacher/components/TeacherCitizenDocumentPage";

export default async function Page({ params }: { params: Promise<{ citizenId: string; documentId: string }> }) {
  const { citizenId, documentId } = await params;
  return <TeacherCitizenDocumentPage citizenId={citizenId} documentId={documentId} />;
}
