import { TeacherShell } from "@/features/teacher/components/TeacherShell";
import { GeneralSettingsProvider } from "@/features/general-settings/components/GeneralSettingsProvider";
export default function Layout({children}:{children:React.ReactNode}){return <GeneralSettingsProvider experience="teacher"><TeacherShell>{children}</TeacherShell></GeneralSettingsProvider>}
