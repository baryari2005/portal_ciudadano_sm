import { redirect } from "next/navigation";

export default async function LegacyEditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/activities/${id}/edit`);
}
