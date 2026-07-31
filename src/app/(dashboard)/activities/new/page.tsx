"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AccessDenied403Page from "../../403/page";
import { CatalogLoadingState } from "@/features/activity-catalogs/components/CatalogPrimitives";
import { createDraftClient } from "@/features/activity-workflow/services/activity-drafts.service";
import { useCan } from "@/hooks/useCan";
export default function NewActivityPage() { const router = useRouter(), started = useRef(false), canCreate = useCan("actividades", "crear"); useEffect(() => { if (!canCreate || started.current) return; started.current = true; void createDraftClient().then((draft) => router.replace(`/activities/workflow/${draft.id}`)); }, [canCreate, router]); if (!canCreate) return <AccessDenied403Page />; return <CatalogLoadingState label="nuevo workflow de actividad" fullPage />; }
