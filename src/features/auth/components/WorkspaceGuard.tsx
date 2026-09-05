"use client";
import { useEffect, useState } from "react";
import Loading from "@/app/(dashboard)/loading";
import { getTeacherProfileClient } from "@/features/teacher/services/teacher.service";
import { useAuth } from "@/stores/auth";
import { WorkspaceAccessDenied } from "./WorkspaceAccessDenied";
import { hasCitizenWorkspace, hasReceptionWorkspace, hasAdministrativeWorkspace, hasTeacherPermissions } from "../libs/workspaces";
export function WorkspaceGuard({ workspace, children }: { workspace: "administration" | "reception" | "teacher" | "citizen"; children: React.ReactNode }) {
  const user = useAuth((state) => state.user), [checking, setChecking] = useState(workspace === "teacher"), [teacherEnabled, setTeacherEnabled] = useState(false);
  const allowed = workspace === "administration" ? hasAdministrativeWorkspace(user) : workspace === "reception" ? hasReceptionWorkspace(user) : workspace === "teacher" ? hasTeacherPermissions(user) && teacherEnabled : hasCitizenWorkspace(user);
  useEffect(() => { if (workspace !== "teacher" || !user || !hasTeacherPermissions(user)) { setChecking(false); return; } setChecking(true); void getTeacherProfileClient().then((profile) => setTeacherEnabled(profile.estado === "ACTIVO")).catch(() => setTeacherEnabled(false)).finally(() => setChecking(false)); }, [workspace, user]);
  if (checking) return <Loading />;
  if (!allowed) return <WorkspaceAccessDenied />;
  return <>{children}</>;
}
