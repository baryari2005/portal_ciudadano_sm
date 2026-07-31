"use client";
import AccessDenied403Page from "../403/page";
import { useCan } from "@/hooks/useCan";
import { ResourcesPage } from "@/features/resources/components/ResourcesPage";
export default function Page() { return useCan("resources", "ver") ? <ResourcesPage /> : <AccessDenied403Page />; }
