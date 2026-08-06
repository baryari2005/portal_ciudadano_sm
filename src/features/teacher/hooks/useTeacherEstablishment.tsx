"use client";
import { WorkspaceEstablishmentProvider,useWorkspaceEstablishment } from "@/features/workspace-establishment/WorkspaceEstablishmentProvider";
export function TeacherEstablishmentProvider({children}:{children:React.ReactNode}){return <WorkspaceEstablishmentProvider workspace="teacher">{children}</WorkspaceEstablishmentProvider>}
export function useTeacherEstablishment(){const value=useWorkspaceEstablishment();return{establishments:value.options,establishmentId:value.establishmentId,loading:value.loading,setEstablishmentId:value.setEstablishmentId}}
