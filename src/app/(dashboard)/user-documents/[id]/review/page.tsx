import { UserDocumentReviewPage } from "@/features/user-documents/components/UserDocumentReviewPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <UserDocumentReviewPage documentId={(await params).id} />; }
