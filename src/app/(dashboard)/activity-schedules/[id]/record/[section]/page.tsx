import { notFound } from "next/navigation";
import { ActivityScheduleRecordPage } from "@/features/activity-schedules/components/ActivityScheduleRecordPage";
import { ACTIVITY_SCHEDULE_RECORD_SECTIONS, type ActivityScheduleRecordSection } from "@/features/activity-schedules/constants/activity-schedule-record-sections";

export default async function Page({ params }: { params: Promise<{ id:string; section:string }> }) {
  const { id, section } = await params;
  if (!ACTIVITY_SCHEDULE_RECORD_SECTIONS.includes(section as ActivityScheduleRecordSection)) notFound();
  return <ActivityScheduleRecordPage scheduleId={id} section={section as ActivityScheduleRecordSection} />;
}
