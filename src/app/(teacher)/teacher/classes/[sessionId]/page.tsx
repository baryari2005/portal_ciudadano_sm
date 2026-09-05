import { TeacherClassOverviewPage } from "@/features/teacher/components/TeacherClassOverviewPage";

export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  return <TeacherClassOverviewPage sessionId={(await params).sessionId} />;
}
