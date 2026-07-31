"use client";
import AccessDenied403Page from "../403/page";
import { ActivitySessionsPage } from "@/features/activity-sessions/components/ActivitySessionsPage";
import { useCan } from "@/hooks/useCan";
export default function Page(){return useCan("activity_sessions","ver")?<ActivitySessionsPage/>:<AccessDenied403Page/>}
