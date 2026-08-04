import { ActivityWorkflow } from "@/features/activity-workflow/components/ActivityWorkflow";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ActivityWorkflow draftId={(await params).id} />;
}
