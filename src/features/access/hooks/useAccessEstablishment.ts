"use client";
import { useWorkspaceEstablishment } from "@/features/workspace-establishment/WorkspaceEstablishmentProvider";
export function useAccessEstablishment(){const value=useWorkspaceEstablishment();return{options:value.options,establishmentId:value.establishmentId,setEstablishmentId:value.setEstablishmentId,loading:value.loading,selected:value.selected}}
