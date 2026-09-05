"use client";
import { NotificationsWorkspacePage } from "@/features/notifications/components/CitizenNotificationsPage";
import { ReceptionMobileNotifications } from "./mobile/ReceptionMobileNotifications";
export function ReceptionNotificationsPage(){return <><ReceptionMobileNotifications/><div className="hidden md:block"><NotificationsWorkspacePage title="Notificaciones" workspace="reception"/></div></>}
