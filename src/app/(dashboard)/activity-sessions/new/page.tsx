"use client";
import { useSearchParams } from "next/navigation";
import AccessDenied403Page from "../../403/page";
import { AdminFormPage } from "@/components/layout/admin-form-page";
import { ActivitySessionForm } from "@/features/activity-sessions/components/ActivitySessionForm";
import { useCan } from "@/hooks/useCan";
export default function Page(){useSearchParams();if(!useCan("activity_sessions","crear"))return <AccessDenied403Page/>;return <AdminFormPage title="Nueva clase" description="Creá una clase individual o generá varias desde un horario recurrente." breadcrumbs={[{label:"Clases programadas",href:"/activity-sessions"},{label:"Nueva clase"}]} fullWidth><ActivitySessionForm/></AdminFormPage>}
