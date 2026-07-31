import { RequirementFormPage } from "@/features/requirements/components/RequirementFormPage";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <RequirementFormPage id={(await params).id}/>; }
