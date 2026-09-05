import { TeacherShell } from "@/features/teacher/components/TeacherShell";
import { WorkspaceGuard } from "@/features/auth/components/WorkspaceGuard";
import { GeneralSettingsProvider } from "@/features/general-settings/components/GeneralSettingsProvider";
export default function Layout({children}:{children:React.ReactNode}){return <GeneralSettingsProvider experience="teacher"><TeacherShell><WorkspaceGuard workspace="teacher">{children}</WorkspaceGuard></TeacherShell></GeneralSettingsProvider>}
