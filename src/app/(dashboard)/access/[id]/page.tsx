import { AccessDetailPage } from "@/features/access/components/AccessDetailPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <AccessDetailPage id={(await params).id}/>; }
