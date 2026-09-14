import { ActivityWorkflow } from "@/features/activity-workflow/components/ActivityWorkflow";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ActivityWorkflow key={id} draftId={id} />;
}
