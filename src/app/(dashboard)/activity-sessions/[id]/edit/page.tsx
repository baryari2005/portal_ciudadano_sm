"use client";
import { use, useCallback, useEffect, useState } from "react";
import AccessDenied403Page from "../../../403/page";
import { AdminFormError, AdminFormPage } from "@/components/layout/admin-form-page";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { ActivitySessionForm } from "@/features/activity-sessions/components/ActivitySessionForm";
import { getActivitySessionClient } from "@/features/activity-sessions/services/activity-sessions.service";
import type { ActivitySession } from "@/features/activity-sessions/types/activity-session.types";
import { useCan } from "@/hooks/useCan";
export default function Page({params}:{params:Promise<{id:string}>}){const{id}=use(params);const[item,setItem]=useState<ActivitySession|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(false);const load=useCallback(()=>{setLoading(true);setError(false);getActivitySessionClient(id).then(setItem).catch(()=>setError(true)).finally(()=>setLoading(false))},[id]);useEffect(load,[load]);if(!useCan("activity_sessions","editar"))return <AccessDenied403Page/>;if(loading)return <CatalogLoadingState label="clase programada" fullPage/>;if(error||!item)return <AdminFormPage title="Editar clase" description=""><AdminFormError message="No pudimos cargar la clase." backHref="/activity-sessions" onRetry={load}/></AdminFormPage>;return <AdminFormPage title="Editar clase" description="Actualizá esta ocurrencia sin modificar su horario recurrente." breadcrumbs={[{label:"Clases programadas",href:"/activity-sessions"},{label:"Editar clase"}]} fullWidth><ActivitySessionForm initialValues={item}/></AdminFormPage>}
