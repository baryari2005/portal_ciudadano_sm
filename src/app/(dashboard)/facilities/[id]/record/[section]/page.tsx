import { notFound } from "next/navigation";
import { FacilityRecordPage, type FacilityRecordSection } from "@/features/establecimientos/components/FacilityRecordPage";
const sections = ["overview", "opening-hours", "activities", "schedules"] as const;
export default async function Page({ params }: { params: Promise<{ id: string; section: string }> }) { const { id, section } = await params; if (!sections.includes(section as FacilityRecordSection)) notFound(); return <FacilityRecordPage facilityId={id} section={section as FacilityRecordSection} />; }
