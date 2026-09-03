import { TeacherShell } from "@/features/teacher/components/TeacherShell";
import { WorkspaceGuard } from "@/features/auth/components/WorkspaceGuard";
export default function Layout({children}:{children:React.ReactNode}){return <TeacherShell><WorkspaceGuard workspace="teacher">{children}</WorkspaceGuard></TeacherShell>}
