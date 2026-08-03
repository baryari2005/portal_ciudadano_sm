"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/app/(dashboard)/loading";
import { getTeacherProfileClient } from "@/features/teacher/services/teacher.service";
import { useAuth } from "@/stores/auth";
import { getDefaultWorkspace, hasReceptionWorkspace, hasAdministrativeWorkspace, hasTeacherPermissions } from "../libs/workspaces";
export function WorkspaceGuard({ workspace, children }: { workspace: "administration" | "reception" | "teacher"; children: React.ReactNode }) {
  const router = useRouter(), user = useAuth((state) => state.user), [checking, setChecking] = useState(workspace === "teacher"), [teacherEnabled, setTeacherEnabled] = useState(false);
  const allowed = workspace === "administration" ? hasAdministrativeWorkspace(user) : workspace === "reception" ? hasReceptionWorkspace(user) : hasTeacherPermissions(user) && teacherEnabled;
  useEffect(() => { if (workspace !== "teacher" || !user || !hasTeacherPermissions(user)) { setChecking(false); return; } setChecking(true); void getTeacherProfileClient().then((profile) => setTeacherEnabled(profile.estado === "ACTIVO")).catch(() => setTeacherEnabled(false)).finally(() => setChecking(false)); }, [workspace, user]);
  useEffect(() => { if (!checking && user && !allowed) router.replace(getDefaultWorkspace(user, teacherEnabled)); }, [allowed, checking, router, teacherEnabled, user]);
  if (checking || !allowed) return <Loading />;
  return <>{children}</>;
}
