import { TeacherSuspendClassPage } from "@/features/teacher/components/TeacherSuspendClassPage";
export default async function Page({params}:{params:Promise<{sessionId:string}>}){return <TeacherSuspendClassPage sessionId={(await params).sessionId}/>}
