import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { WorkspaceEstablishmentSelectionPage } from "@/features/workspace-establishment/WorkspaceEstablishmentSelectionPage";
export default function Page(){return <RequireAuth><WorkspaceEstablishmentSelectionPage/></RequireAuth>}
