import { notFound } from "next/navigation";
import { ActivityRecordPage } from "@/features/actividades/components/ActivityRecordPage";
const sections = ["overview", "schedules", "sessions", "enrollments", "requirements"] as const;
export default async function Page({ params }: { params: Promise<{ id: string; section: string }> }) { const { id, section } = await params; if (!sections.includes(section as typeof sections[number])) notFound(); return <ActivityRecordPage activityId={id} section={section as typeof sections[number]} />; }
