import { CitizenNotificationsPage } from "@/features/notifications/components/CitizenNotificationsPage";

export default function Page() {
  return (
    <CitizenNotificationsPage
      title="Notificaciones"
      scope="teacher"
      workspace="teacher"
      showSentMailbox
    />
  );
}
