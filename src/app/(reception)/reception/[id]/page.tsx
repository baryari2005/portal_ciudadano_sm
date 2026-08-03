import { AccessDetailPage } from "@/features/access/components/AccessDetailPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AccessDetailPage id={id} />; }
